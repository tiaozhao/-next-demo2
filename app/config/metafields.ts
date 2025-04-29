export const METAFIELD_DEFINITIONS = [
  {
    name: "AppUrl",
    namespace: "aaxis_streamline",
    key: "aaxis_streamline_appUrl",
    type: "single_line_text_field",
    description: "app url",
    ownerType: "SHOP",
    access: {
      storefront: "PUBLIC_READ",
      customerAccount: "READ",
    },
    capabilities: {
      smartCollectionCondition: {
        enabled: true,
      },
      adminFilterable: {
        enabled: true,
      },
    },
  },
  {
    name: "Featured",
    namespace: "custom",
    key: "featured",
    type: "boolean",
    description: "Featured Products flag",
    ownerType: "PRODUCT",

    capabilities: {
      smartCollectionCondition: {
        enabled: true,
      },
      adminFilterable: {
        enabled: true,
      },
    },
  },
  {
    name: "Featured Plumbing",
    namespace: "custom",
    key: "featured_plumbing",
    type: "boolean",
    description: "Featured Plumbing Products flag",
    ownerType: "PRODUCT",

    capabilities: {
      smartCollectionCondition: {
        enabled: true,
      },
      adminFilterable: {
        enabled: true,
      },
    },
  },
  {
    name: "Featured",
    namespace: "custom",
    key: "featured",
    type: "boolean",
    description: "Featured Category flag",
    ownerType: "COLLECTION"
  },
  {
    name: "draftOrder",
    namespace: "custom",
    key: "draft_order",
    type: "json",
    description: "draftOrder info",
    ownerType: "ORDER"
  },
  {
    name: "operatorInfo",
    namespace: "custom",
    key: "operator_info",
    type: "json",
    description: "operator info",
    ownerType: "DRAFTORDER"

  },
  {
    name: "UOM",
    namespace: "custom",
    key: "custom_uom",
    type: "single_line_text_field",
    description: "UOM info",
    ownerType: "PRODUCTVARIANT",
    capabilities: {
      smartCollectionCondition: {
        enabled: true,
      },
    },
  },
  {
    name: "Specifications",
    namespace: "custom",
    key: "custom_specifications",
    type: "json",
    description: "Specifications info",
    ownerType: "PRODUCTVARIANT"

  },
  {
    name: "Documents",
    namespace: "custom",
    key: "custom_documents",
    type: "list.file_reference",
    description: "Documents info",
    ownerType: "PRODUCT"

  },
  {
    name: "Original Price",
    namespace: "custom",
    key: "custom_original_price",
    type: "number_decimal",
    description: "Original Price info",
    ownerType: "PRODUCTVARIANT",

    capabilities: {
      smartCollectionCondition: {
        enabled: true,
      },
    },
  },
  {
    name: "Material",
    namespace: "custom",
    key: "material",
    type: "json",
    description: "Detailed material information for the product",
    ownerType: "PRODUCTVARIANT"

  },
  {
    name: "Warranty Information",
    namespace: "custom",
    key: "warranty_info",
    type: "json",
    description: "Product warranty information",
    ownerType: "PRODUCTVARIANT"

  },
  {
    name: "Product Badges",
    namespace: "custom",
    key: "product_badges",
    type: "json",
    description: "Product badges for special markings or highlights",
    ownerType: "PRODUCTVARIANT"

  },
  {
    name: "Color",
    namespace: "custom",
    key: "color",
    type: "color",
    description: "Product color with additional information",
    ownerType: "PRODUCTVARIANT"

  },
  {
    name: "Dimensions",
    namespace: "custom",
    key: "dimensions",
    type: "json",
    description: "Product dimensions including length, width, and height",
    ownerType: "PRODUCTVARIANT"

  },
  {
    name: "PO Image Links",
    namespace: "custom",
    key: "custom_po_images_draft_order",
    type: "json",
    description:
      "Stores parsed image links from purchase order processing for draft orders",
    ownerType: "DRAFTORDER"

  },
  {
    name: "PO Image Links",
    namespace: "custom",
    key: "custom_po_images_order",
    type: "json",
    description:
      "Stores parsed image links from purchase order processing for orders",
    ownerType: "ORDER"
  },
];
