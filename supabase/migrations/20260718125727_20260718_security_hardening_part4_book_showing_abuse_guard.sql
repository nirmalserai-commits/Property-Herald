/*
# Security Hardening Part 4 — book_showing: keep public, add abuse guard

## Summary
Part 3 revoked anon EXECUTE on book_showing, but the public listings
page lets any visitor open the booking modal and submit a request
(ListingsPage renders the modal with no auth gate). Revoking anon
would break the public booking flow. This migration restores anon
execute AND adds an internal abuse guard so the SECURITY DEFINER
function cannot be used to drain a developer's token wallet by
spamming booking requests.

## Rationale
The security advisor flags anon-executable SECURITY DEFINER functions.
For book_showing, anon execute is intentional — public visitors must
be able to book showings without signing in. The real risk was that
each call deducts 5 tokens from the listing developer's wallet, so an
attacker could spam the RPC to drain that wallet. The fix is to cap
new bookings per listing per day (max 10) inside the function, so a
flood of calls cannot burn more than 50 tokens/listing/day while still
letting genuine visitors book.

## Changes
1. REVOKE / re-GRANT to restore anon execute on book_showing.
2. Recreate book_showing with an added guard: before inserting a new
   booking or deducting tokens, count existing bookings for the same
   listing created today; if >= 10, abort with a clear error and
   deduct zero tokens. Function body otherwise unchanged.
3. increment_ambassador_count: left authenticated-only from Part 3.
   The ambassador widget calls it but the call is fire-and-forget
   (.catch(() => {})) — a failed anon call is silently ignored and
   does not break the widget. Counter inflation by anon was the real
   risk; keeping it authenticated-only is correct.

## Notes
- Idempotent: DROP POLICY / CREATE OR REPLACE FUNCTION.
- No data deleted.
*/

-- Restore anon execute on book_showing (public booking flow needs it)
REVOKE EXECUTE ON FUNCTION public.book_showing(uuid, text, text, text, date, text, text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_showing(uuid, text, text, text, date, text, text) TO anon, authenticated;

-- Recreate with per-listing daily cap (abuse guard)
CREATE OR REPLACE FUNCTION public.book_showing(
  p_listing_id uuid, p_buyer_name text, p_buyer_phone text, p_buyer_email text,
  p_preferred_date date, p_preferred_time text, p_message text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_developer_id UUID; v_wallet_balance INTEGER; v_booking_id UUID; v_new_balance INTEGER;
  v_today_count INTEGER;
BEGIN
  SELECT profile_id INTO v_developer_id FROM listings WHERE id = p_listing_id;
  IF v_developer_id IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;

  -- Abuse guard: max 10 new bookings per listing per day
  SELECT COUNT(*) INTO v_today_count
  FROM show_apartment_bookings
  WHERE listing_id = p_listing_id
    AND created_at >= CURRENT_DATE;
  IF v_today_count >= 10 THEN
    RAISE EXCEPTION 'This listing has reached its daily booking limit. Please try again tomorrow.';
  END IF;

  SELECT balance INTO v_wallet_balance FROM token_wallets WHERE user_id = v_developer_id;
  IF v_wallet_balance IS NULL THEN RAISE EXCEPTION 'Developer has no token wallet'; END IF;
  IF v_wallet_balance < 5 THEN
    RAISE EXCEPTION 'Insufficient tokens — developer has % tokens, needs 5', v_wallet_balance;
  END IF;
  INSERT INTO show_apartment_bookings (
    listing_id, developer_id, buyer_name, buyer_phone, buyer_email,
    preferred_date, preferred_time, message, tokens_deducted
  ) VALUES (
    p_listing_id, v_developer_id, p_buyer_name, p_buyer_phone, p_buyer_email,
    p_preferred_date, p_preferred_time, p_message, 5
  ) RETURNING id INTO v_booking_id;
  UPDATE token_wallets SET balance = balance - 5, updated_at = NOW()
  WHERE user_id = v_developer_id RETURNING balance INTO v_new_balance;
  INSERT INTO token_transactions (user_id, type, amount, reason, related_listing_id, balance_after)
  VALUES (v_developer_id, 'burn', -5, 'Show apartment booking', p_listing_id, v_new_balance);
  RETURN v_booking_id;
END;
$function$;
