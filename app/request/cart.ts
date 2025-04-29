import { globalFetch } from "~/lib/fetch";
import { updateMiniCart } from "~/lib/utils";

export async function getCartAjax() {
  try {
    const response = await globalFetch(`/cart.js`, {
      method: "GET",
      type: "ajax",
    });
    return response;
  } catch (error) {
    throw error;
  }
}

export async function addToCartAjax(
  items: {
    id: number;
    quantity: number;
  }[],
) {
  try {
    const response = await globalFetch("/cart/add.js", {
      method: "POST",
      type: "ajax",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items,
        sections: 'cart-drawer,cart-icon-bubble',
      }),
    });

    if (response?.sections) {
      updateMiniCart(response);
    }

    return response;
  } catch (error) {
    throw error;
  }
}
