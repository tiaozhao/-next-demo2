import { useTranslation } from "react-i18next";
import { SUBSCRIPTION_RECOMMENDED_PRODUCT_STORAGE_KEY } from "~/lib/subscription-orders";
import RecommendForYouProductCard, {
  RecommendForYouProductCardProps,
} from "./RecommendForYouProductCard";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { useGetRecommendedProducts } from "~/hooks/use-subscription-orders";
import { useShopifyInformation } from "~/lib/shopify";
import { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import {
  useCustomerPartnerNumberBySku,
  useGetProductVariantsByApi,
} from "~/hooks/use-product-search";
import _ from "lodash";
import { extractVariantId, flatSearchResultV2 } from "~/lib/quick-order";
interface RecommendForYouProps {
  handleAddRecommendedProductAtForm: (skus: string[]) => void;
  isAddingRecommendedProduct?: boolean;
  isAddingRecommendedProductSkus?: string[];
  companyLocationId?: string;
}
export default function RecommendForYou({
  handleAddRecommendedProductAtForm,
  isAddingRecommendedProduct,
  isAddingRecommendedProductSkus,
  companyLocationId,
}: RecommendForYouProps) {
  const { t } = useTranslation();
  const {
    storeName,
    shopifyCompanyLocationId,
    shopifyCustomerId,
    shopifyCompanyId,
  } = useShopifyInformation();
  const swiperRef = useRef<SwiperType>();
  const { data: recommendedProducts, isLoading: isLoadingRecommendedProducts } =
    useGetRecommendedProducts({
      customerId: shopifyCustomerId,
      storeName: storeName,
      companyLocationId: companyLocationId || shopifyCompanyLocationId,
    });
  const skus =
    recommendedProducts?.recommendations.map((product) => product.skuId) || [];
  const { data: productVariants, isLoading: isLoadingProductVariants } =
    useGetProductVariantsByApi(
      {
        query: skus,
        companyLocationId: companyLocationId || shopifyCompanyLocationId,
        storeName: storeName,
        customerId: shopifyCustomerId,
        companyId: shopifyCompanyId,
      },
      _.isArray(recommendedProducts?.recommendations) &&
        recommendedProducts?.recommendations.length > 0,
    );
  const {
    data: customerPartnerNumberBySku,
    isLoading: isLoadingCustomerPartnerNumberBySku,
  } = useCustomerPartnerNumberBySku(
    {
      skuIds: skus,
      companyId: shopifyCompanyId,
      storeName: storeName,
    },
    _.isArray(recommendedProducts?.recommendations) &&
      recommendedProducts?.recommendations.length > 0,
  );

  const [recommendForYouProducts, setRecommendForYouProducts] = useState<
    RecommendForYouProductCardProps["product"][]
  >([]);

  useEffect(() => {
    if (productVariants) {
      const results = flatSearchResultV2(productVariants.products);
      const filteredResults: RecommendForYouProductCardProps["product"][] =
        results
          .map((product) => {
            // check if the variant is in the skus array
            const findItems = skus.includes(product.sku);
            if (findItems) {
              const item: RecommendForYouProductCardProps["product"] = {
                id: _.toNumber(extractVariantId(_.toString(product.variantId))),
                vendor: product?.vendor || "",
                title: product?.name || "",
                uom: product?.uom?.[0] || "",
                listPrice: {
                  amount: _.toNumber(product?.originalPrice) || 0,
                  currency: product?.price?.currencyCode || "USD",
                },
                price: {
                  amount: _.toNumber(product?.price?.amount) || 0,
                  currency: product?.price?.currencyCode || "USD",
                },
                image: product?.image || "",
                link: `https://${storeName}/products/${product?.handle}`,
                createdAt: product?.createdAt || "",
                customerPartnerNumber:
                  customerPartnerNumberBySku?.customerPartnerNumberDetails.find(
                    (item) => item.skuId === product.sku,
                  )?.customerPartnerNumber || "",
                SKU: product?.sku || "",
                score:
                  recommendedProducts?.recommendations.find(
                    (item) => item.skuId === product.sku,
                  )?.score || 0,
              };
              return item;
            }
          })
          .filter(
            (item): item is RecommendForYouProductCardProps["product"] =>
              item !== undefined,
          )
          .sort((a, b) => _.toNumber(b?.score) - _.toNumber(a?.score));
      setRecommendForYouProducts(filteredResults);

      // Reset swiper to first slide
      if (swiperRef.current) {
        swiperRef.current.slideTo(0);
      }
    }
  }, [productVariants, customerPartnerNumberBySku]);

  const elId = {
    sliderPrev: "recommend-for-you-slider-prev",
    sliderNext: "recommend-for-you-slider-next",
    sliderPagination: "recommend-for-you-slider-pagination",
  };

  const handleBtnFunction = (sku: string) => {
    handleAddRecommendedProductAtForm([sku]);
    sessionStorage.setItem(
      SUBSCRIPTION_RECOMMENDED_PRODUCT_STORAGE_KEY,
      JSON.stringify({
        recommendedProducts: [
          {
            sku,
          },
        ],
      }),
    );
  };

  return (
    <div className="flex flex-col gap-y-2">
      <div className="text-2xl font-bold">
        <span>{t("subscription-orders.recommend-for-you.title.black")}</span>{" "}
        <span className="text-secondary">
          {t("subscription-orders.recommend-for-you.title.white")}
        </span>
      </div>

      {/* based on side bar menu width and margin, to fixed the swiper width */}
      {isLoadingRecommendedProducts ||
      isLoadingProductVariants ||
      isLoadingCustomerPartnerNumberBySku ? (
        <div className="max-w-[calc(80rem-257px-20px)] relative flex items-center justify-center h-full">
          <Loader2 className="w-10 h-10 animate-spin" />
        </div>
      ) : (
        <div className="max-w-[calc(80rem-257px-20px)] relative">
          <div className="app-hidden md:block">
            <div
              id={elId.sliderPrev}
              className='swiper-button-prev !bg-white !w-10 !h-10 rounded-full shadow-lg   !text-gray-700 after:!content-[""] !left-[calc(-1rem-5px)] !top-[calc(50%-20px)] !border !border-gray-100 z-[2]'
            >
              {/* make this icon looks same as Shopify Theme icon */}
              <div className="w-6 h-6 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                >
                  <path
                    d="M4.68979 8.41691L11.3657 1.74139C11.6875 1.41954 12.2096 1.41954 12.5315 1.74139L13.3102 2.5201C13.6317 2.84161 13.632 3.36236 13.3116 3.68456L8.02068 8.99983L13.3112 14.3154C13.632 14.6376 13.6314 15.1584 13.3098 15.4799L12.5311 16.2586C12.2093 16.5805 11.6872 16.5805 11.3653 16.2586L4.68979 9.58274C4.36793 9.26089 4.36793 8.73877 4.68979 8.41691Z"
                    fill="currentColor"
                  ></path>
                </svg>
              </div>
            </div>
            <div
              id={elId.sliderNext}
              className='swiper-button-next !bg-white !w-10 !h-10 rounded-full shadow-lg   !text-gray-700 after:!content-[""] !right-[calc(-1rem-5px)] !top-[calc(50%-20px)] !border !border-gray-100 z-[2]'
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 18 18"
                  fill="none"
                >
                  <path
                    d="M13.3101 9.58293L6.63442 16.2585C6.31247 16.5805 5.79049 16.5805 5.46856 16.2585L4.68996 15.4799C4.36855 15.1585 4.36794 14.6376 4.68859 14.3154L9.97915 8.99998L4.68859 3.68456C4.36794 3.36239 4.36855 2.84148 4.68996 2.52007L5.46856 1.74147C5.79052 1.41951 6.3125 1.41951 6.63442 1.74147L13.31 8.41707C13.632 8.73899 13.632 9.26097 13.3101 9.58293Z"
                    fill="currentColor"
                  ></path>
                </svg>
              </div>
            </div>
          </div>
          <Swiper
            modules={[Navigation, Pagination]}
            spaceBetween={24}
            noSwipingClass="swiper-no-swiping"
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            navigation={{
              nextEl: `#${elId.sliderNext}`,
              prevEl: `#${elId.sliderPrev}`,
            }}
            pagination={{
              clickable: true,
              el: `#${elId.sliderPagination}`,
              dynamicBullets: true,
              dynamicMainBullets: 3,
            }}
            breakpoints={{
              320: {
                slidesPerView: 1,
                slidesPerGroup: 1,
                spaceBetween: 16,
              },
              768: {
                slidesPerView: 3,
                slidesPerGroup: 3,
                spaceBetween: 24,
              },
              1024: {
                slidesPerView: 4,
                slidesPerGroup: 4,
                spaceBetween: 24,
              },
              1280: {
                slidesPerView: 4,
                slidesPerGroup: 4,
                spaceBetween: 24,
              },
            }}
          >
            {recommendForYouProducts.map((product) => (
              <SwiperSlide key={product.id} className="!h-auto">
                <RecommendForYouProductCard
                  product={product}
                  btnFunction={(sku) => handleBtnFunction(sku)}
                  disabled={isAddingRecommendedProduct}
                  loading={
                    isAddingRecommendedProduct &&
                    isAddingRecommendedProductSkus?.includes(product.SKU)
                  }
                />
              </SwiperSlide>
            ))}
          </Swiper>
          <div
            id={elId.sliderPagination}
            className="swiper-pagination !relative mt-8"
          ></div>
        </div>
      )}
    </div>
  );
}
