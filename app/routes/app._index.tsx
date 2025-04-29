import {useEffect, useMemo, useState} from 'react';
import type { LoaderFunctionArgs } from "@remix-run/node";
import {
  Page,
  Button,
  Text,
  Collapsible,
  ResourceItem,
  ResourceList,
  Icon,
  List,
  InlineStack,
  Box, BlockStack,
} from '@shopify/polaris';
import {ChevronUpIcon, ChevronDownIcon} from '@shopify/polaris-icons';
import { authenticate } from "../shopify.server";
import { Redirect } from "@shopify/app-bridge/actions";
import type { ClientApplication } from "@shopify/app-bridge";
import { useShopTheme } from "~/hooks/use-customers";
import {useAppBridge} from '@shopify/app-bridge-react';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const apiKey = process.env.SHOPIFY_API_KEY;
  try {
    const { session } = await authenticate.admin(request);
    const text = { shopDomain: session.shop, apiKey: apiKey };
    return text;
  } catch (error) {
    console.log("app loader error", error);
    return null
  }
};

export default function Index() {
  const { themeId, isLoading, fetchShopTheme } = useShopTheme();
  const shopify = useAppBridge();

  useEffect(() => {
    fetchShopTheme();
  }, []);

  const getDefaultPath = ()=>{
    return `${shopify.origin}/store/${shopify.config.shop?.split('.')[0]}`
  }

  const goToThemeEditorApp = () => {
    if (isLoading || !themeId) return;
    window.open(getDefaultPath()+`/themes/${themeId}/editor?context=apps`)
  }

  const goToThemeEditor = () => {
    if (isLoading || !themeId) return;
    window.open(getDefaultPath()+`/themes/${themeId}/editor`)
  };

  const [current, setCurrent] = useState(-1)

  const list = [
    {
      title: 'Enable App Embeds',
      img: 'https://storage.googleapis.com/shopify-rds-dev-static-storage/assets/instruction-d.gif',
      redirectFn: goToThemeEditorApp,
      button: 'Embed Apps',
      data: [
        <span>Select <strong>App Embeds</strong> from the left menu in your store theme setting.</span>,
        <span>Seach for "AAXIS Steamline" to filter available app embeds.</span>,
        <span>You'll find extensions like <strong>Compare Tray</strong>, <strong>Customer Partner Number</strong>,
          <strong> Cart Item Selector</strong> and <strong>Add to Shopping List</strong> from AAXIS Streamline.</span>,
        <span>Toggle all needed App Embeds to <strong>enabled</strong> based on your requirements.</span>
,
        <span><strong>Note: Feel free to skip this step if it's already been done.</strong></span>
      ]
            },
    {
      title: 'Enable Announcement Bar Blocks',
      img: 'https://storage.googleapis.com/shopify-rds-dev-static-storage/assets/instruction-c.gif',
      redirectFn: goToThemeEditor,
      button: 'Add Blocks',
      data: [
        <span>Click <strong>Add block</strong> in Announcement Bar section.</span>,
        <span>Select <strong>Apps</strong> tab.</span>,
        'Add these essential blocks:',
        [
          'Company Management Block.',
          'Price List Block.',
          'Quick Order Block → URL: /apps/customer-account/quick-order.'
        ]
      ]
    },
            {
              title: 'Enable Header Block',
              img: 'https://storage.googleapis.com/shopify-rds-dev-static-storage/assets/instruction-a.gif',
              redirectFn: goToThemeEditor,
              button: 'Add Block',
              data: [
                <span>Click <strong>Add block</strong> in Header section.</span>,
                <span>Select <strong>Apps</strong> tab.</span>,
              <span>Add <strong>Shopping List Block</strong> → URL: /apps/customer-account/shopping-lists.</span>
              ]
            },
            {
              title: 'Enable Partner Search Block',
              img: 'https://storage.googleapis.com/shopify-rds-dev-static-storage/assets/instruction-b.gif',
              redirectFn: goToThemeEditor,
              button: 'Add Block',
              data: [
                <span>Click <strong>Add block</strong> in App section.</span>,
                <span>Add <strong>Partner Code Search Action</strong> block.</span>,
              'Set URL → https://b2b-rds.aaxis.io/api/v1/product-variant/customer-partner-number/search',
              'Save all changes to apply your settings.'
              ]
            },

            ]

  return (
    <Page>
        <Box padding={'500'} borderRadius={'200'} background={'bg-surface'}>
          <BlockStack gap={'300'}>
            <Text variant={'headingMd'} as={'h2'}>Setup Guide: Start with AAXIS Streamline</Text>
            <Text variant={'bodyLg'} as={'p'}>
              Utilize this guide to set up and configure the AAXIS Streamline app for your B2B commerce experience.
            </Text>

          <ResourceList
            resourceName={{singular: 'customer', plural: 'customers'}}
            items={list}
            renderItem={(item, index) => {
              const {title, data, redirectFn,img, button} = item;
              const open = Number(index) === current
              const media = <div><Icon source={!open ? ChevronDownIcon : ChevronUpIcon}/></div>
              return (
                <Box borderRadius={'200'} background={open ? 'bg-surface-secondary' : 'bg-surface'}>
                  <ResourceItem
                    id={index}
                    onClick={() => {
                      setCurrent(Number(index))
                    }}
                    verticalAlignment={"leading"}
                    media={media}
                  >
                    {
                      !open ? (
                        <Text variant="bodyMd" fontWeight="bold" as="h3">
                          {title}
                        </Text>
                      ) : (
                        <Collapsible
                          open={open}
                          id="basic-collapsible"
                          transition={{duration: '500ms', timingFunction: 'ease-in-out'}}
                          expandOnPrint
                        >
                          <BlockStack gap={'200'}>
                            <Text variant="bodyMd" fontWeight="bold" as="h3">
                              {title}
                            </Text>
                            <InlineStack wrap={false} align={'space-between'}>
                              <BlockStack gap={'200'}>
                                <List type="bullet">
                                  {
                                    data.map((item, index) => {
                                      if (!item.map) {
                                        return <List.Item key={index}>{item}</List.Item>
                                      } else {
                                        return <List key={index} type="bullet">
                                          {
                                            item.map((subItem) => {
                                              return <List.Item key={subItem}>{subItem}</List.Item>
                                            })
                                          }
                                        </List>
                                      }
                                    })
                                  }
                                </List>
                                <InlineStack>
                                  <Button onClick={redirectFn}>{button} </Button>
                                </InlineStack>
                              </BlockStack>
                              <img
                                alt=""
                                width="200px"
                                style={{
                                  objectFit: 'cover',
                                  objectPosition: 'center',
                                }}
                                src={img}
                              />
                            </InlineStack>
                          </BlockStack>
                        </Collapsible>
                      )
                    }
                  </ResourceItem>
                </Box>
              );
            }}
          />
          </BlockStack>
        </Box>
    </Page>
  );
            }
