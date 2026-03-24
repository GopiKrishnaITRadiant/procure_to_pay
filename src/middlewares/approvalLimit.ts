import { Request, Response, NextFunction } from "express";

interface AuthRequest extends Request {
  user?: any;
}

export const checkApprovalLimit = (amountField: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const amount = req.body[amountField];

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (amount > (req.user.approvalLimit || 0)) {
      return res.status(403).json({
        message: "Approval limit exceeded",
      });
    }

    next();
  };
};