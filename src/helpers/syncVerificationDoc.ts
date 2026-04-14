export async function syncVerificationDocuments(vendorId: string, Document:any, Verification:any) {
  const docs = await Document.aggregate([
    {
      $match: {
        vendorId,
        documentType: "KYC",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        verified: {
          $sum: { $cond: [{ $eq: ["$status", "VERIFIED"] }, 1, 0] },
        },
        rejected: {
          $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] },
        },
      },
    },
  ]);

  const stats = docs[0] || { total: 0, verified: 0, rejected: 0 };

  let status = "PENDING";
  if (stats.verified === stats.total && stats.total > 0) {
    status = "VERIFIED";
  } else if (stats.verified > 0) {
    status = "PARTIAL";
  }

  await Verification.updateOne(
    { vendorId },
    {
      $set: {
        documents: {
          ...stats,
          status,
        },
      },
    },
    { upsert: true }
  );
}