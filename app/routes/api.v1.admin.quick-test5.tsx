import { authenticate } from "~/shopify.server";
import { type ActionFunctionArgs } from '@remix-run/node';
import { withCors } from '~/lib/middleware/cors';

export const loader = withCors(async ({ request }: ActionFunctionArgs) => {
  const appProxyContext = await authenticate.public.appProxy(request);
  const { liquid } = appProxyContext;

  return liquid("Hello {{shop.name}}");
}); 