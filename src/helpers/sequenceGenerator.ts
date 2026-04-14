export const getNextSequence = async (
  connection: any,
  module: "PR" | "PO" | "INV"|"VENDOR" | "KYC"
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