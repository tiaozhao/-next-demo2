import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { useTranslation } from "react-i18next";
import _ from "lodash";

type CustomStatusBadgeType =
  | "blue"
  | "secondary-blue"
  | "deep-blue"
  | "gray"
  | "success";

interface CustomStatusBadgePropsV2 {
  status: string;
  className?: string;
  badgeClassName?: string;
  type?: CustomStatusBadgeType;
}

const renderI18nStatus = (status: string) => {
  const { t } = useTranslation();
  return t(`common.status.${_.kebabCase(status)}`);
};

const getBadgeColor = (type: CustomStatusBadgeType) => {
  if (type === "blue") return "bg-secondary text-white hover:bg-secondary/80";
  if (type === "gray") return "bg-gray-300 text-white hover:bg-gray-300/80";
  if (type === "success") return "bg-success text-white hover:bg-success";
  if (type === "deep-blue") return "bg-blue-900 text-white hover:bg-blue-900";
  if (type === "secondary-blue")
    return "bg-secondary-foreground text-white hover:bg-secondary-foreground";
};

export default function CustomStatusBadgeV2({
  status,
  badgeClassName,
  className,
  type = "blue",
}: CustomStatusBadgePropsV2) {
  return (
    <div className={cn("flex flex-wrap gap-2 flex-col", className)}>
      <Badge
        key={status}
        className={cn(
          "rounded-full text-white p-[4px_12px] font-bold",
          getBadgeColor(type),
          badgeClassName,
        )}
      >
        {renderI18nStatus(status)}
      </Badge>
    </div>
  );
}
