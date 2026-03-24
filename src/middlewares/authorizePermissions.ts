import { Request, Response, NextFunction } from "express";

export const authorize = (...required: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userPermissions = req.user.permissions || [];
    console.log('userper',userPermissions)

    if (userPermissions.includes("access:all")) {
      return next();
    }
    const hasAccess = required.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasAccess) {
      return res.status(403).json({ message: "you don't have access to this route" });
    }

    next();
  };
};