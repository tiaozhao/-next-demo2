export const draftOrderStatusConfig: Record<
  string,
  { label: string; variant: "secondary" | "warning" | "success" }
> = {
  INVOICE_SENT: { label: "Pending Approval", variant: "warning" },
  OPEN: { label: "Pending Approval", variant: "warning" },
  rejected: { label: "Declined", variant: "warning" },
  approved: { label: "Pending Approval", variant: "warning" },
  "po automation": { label: "Pending Approval", variant: "warning" },
  subscription: { label: "Pending Approval", variant: "warning" },
};

export const formatOrderInformationOrderByText = (
  firstName: string | undefined | null,
  lastName: string | undefined | null,
) => {
  if (!firstName && !lastName) return "-";
  return `${firstName || ""} ${lastName || ""}`;
};
