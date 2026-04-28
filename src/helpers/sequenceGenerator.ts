export const getNextSequence = async (
  connection: any,
  module: "PR"|"RFQ" | "PO" | "INV"|"VENDOR" | "KYC"|"GRN"
) => {
  const Counter = connection.model("Counter");

  const year = new Date().getFullYear();

  const counter = await Counter.findOneAndUpdate(
    { module, year },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );

  return counter.sequence;
};