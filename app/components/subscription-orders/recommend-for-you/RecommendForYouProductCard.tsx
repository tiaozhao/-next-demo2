import { Check, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import CustomStatusBadge from "~/components/common/CustomStatusBadge";
import { Button } from "~/components/ui/button";
import { cn, formatPrice } from "~/lib/utils";

export interface RecommendForYouProductCardProps {
  product: {
    id: number;
    vendor: string;
    title: string;
    uom: string;
    listPrice: {
      amount: number;
      currency: string;
    };
    price: {
      amount: number;
      currency: string;
    };
    image: string;
    link: string;
    createdAt: string;
    customerPartnerNumber: string;
    SKU: string;
    score?: number;
  };
  btnFunction: (sku: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

const isNewProduct = (createdAt: string): boolean => {
  const createdDate = new Date(createdAt);
  const currentDate = new Date();
  const diffTime = Math.abs(currentDate.getTime() - createdDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 30;
};

export default function RecommendForYouProductCard({
  product,
  btnFunction,
  disabled = false,
  loading = false,
}: RecommendForYouProductCardProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col border rounded-lg bg-gray-50 h-full pb-2">
      <div className="px-[22px] py-[10px] border-b bg-white rounded-t-md h-[200px] flex items-center justify-center">
        <a
          href={product.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-full"
        >
          <img
            src={product.image}
            alt={product.title}
            className="object-contain w-full h-full"
          />
        </a>
      </div>
      <div className="flex flex-col gap-y-2 flex-1 justify-between">
        <div className="flex flex-col gap-y-1 px-3 py-1">
          <div className="text-xs text-gray-300 font-bold swiper-no-swiping min-h-4 w-full">
            {product.vendor}
          </div>
          <div className="line-clamp-2 text-gray-700 font-bold text-base leading-5 text-ellipsis swiper-no-swiping">
            <a href={product.link} target="_blank" rel="noopener noreferrer">
              {product.title}
            </a>
          </div>
          <div className="text-xs text-gray-700 flex items-center flex-wrap gap-x-[2px] swiper-no-swiping">
            <div>
              {t(
                "subscription-orders.recommend-for-you.product-card.list-price",
              )}
              :
            </div>
            <div className="line-through">
              {formatPrice(
                product.listPrice.amount,
                product.listPrice.currency,
              )}
            </div>
          </div>
          <div className="text-xs text-gray-700 flex items-center flex-wrap gap-x-[2px] swiper-no-swiping">
            <div>
              {t(
                "subscription-orders.recommend-for-you.product-card.your-price",
              )}
              :
            </div>
            <div className="flex items-center">
              <span className="text-lg font-bold">
                {formatPrice(product.price.amount, product.price.currency)}
              </span>{" "}
              / {product.uom}
            </div>
          </div>
          <CustomStatusBadge
            status={"new"}
            badgeClassName="w-fit rounded-full px-3 py-[2px] my-[2px]"
            className={cn(!isNewProduct(product.createdAt) && "opacity-0")}
            type="blue"
          />
          <div className="flex flex-col">
            <div className="text-xs text-gray-700 w-full flex flex-wrap gap-x-1 swiper-no-swiping">
              <div>
                {t(
                  "subscription-orders.recommend-for-you.product-card.customer-partner-number",
                )}
                :
              </div>
              <div className="text-gray-300 min-h-4 w-full">
                {product.customerPartnerNumber}
              </div>
            </div>
            <div className="text-xs text-gray-700 w-full flex flex-wrap gap-x-1 swiper-no-swiping">
              <div>
                {t("subscription-orders.recommend-for-you.product-card.sku")}:
              </div>
              <div className="text-gray-300">{product.SKU}</div>
            </div>
          </div>
        </div>

        <div className="px-3">
          <Button
            className="w-full h-11 border-primary text-primary gap-x-2 hover:text-primary/80"
            variant={"outline"}
            onClick={() => btnFunction(product.SKU)}
            disabled={disabled}
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Check className="!w-6 !h-6" strokeWidth={3}></Check>
                <div className="flex-1">
                  {t(
                    "subscription-orders.recommend-for-you.product-card.subscribe-now",
                  )}
                </div>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
