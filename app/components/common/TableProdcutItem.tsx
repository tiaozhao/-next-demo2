import { ImageIcon } from "lucide-react";
import { cn } from "~/lib/utils";
interface TableProductItemProps {
  imageSrc: string;
  imageAlt: string;
  imageWidth?: number;
  imageHeight?: number;
  title: string;
  sku?: string;
  className?: string;
}

export default function TableProductItem({
  imageSrc,
  imageAlt,
  imageWidth,
  imageHeight,
  title,
  sku,
  className,
}: TableProductItemProps) {
  return (
    <div className={cn("flex items-center gap-[10px]", className)}>
      <div>
        <img
          src={imageSrc || ""}
          alt={imageAlt || ""}
          className={cn(
            "h-[60px] w-[60px] min-w-[60px] max-w-fit rounded border border-gray-200 object-contain",
          )}
          style={{
            width: imageWidth ? `${imageWidth}px` : undefined,
            minWidth: imageWidth ? `${imageWidth}px` : undefined,
            height: imageHeight ? `${imageHeight}px` : undefined,
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            (e.currentTarget?.nextSibling as HTMLElement).style.display =
              "block";
          }}
        />
        <ImageIcon
          className={cn("h-[60px] w-[60px] min-w-[60px] text-gray-400")}
          style={{
            width: imageWidth ? `${imageWidth}px` : undefined,
            height: imageHeight ? `${imageHeight}px` : undefined,
            display: "none",
          }}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="line-clamp-3 print-avoid-word-hidden font-normal">
          {title || ""}
        </div>
        {/* {item?.variant?.title && (
          <div className="bg-gray-50 w-fit max-w-32 text-xs text-gray-500 line-clamp-1 py-1 px-2 rounded-lg">
            {item?.variant?.title || ""}
          </div>
        )} */}
      </div>
    </div>
  );
}
