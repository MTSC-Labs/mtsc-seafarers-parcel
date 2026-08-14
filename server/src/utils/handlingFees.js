const HANDLING_FEES = {
  Small: 0,
  Medium: 0,
  Large: 0,
  'Extra Large': 0,
};

function getHandlingFee(size) {
  const fee = HANDLING_FEES[size];
  if (fee === undefined) throw new Error(`Invalid parcel size: ${size}`);
  return fee;
}

module.exports = { HANDLING_FEES, getHandlingFee };
