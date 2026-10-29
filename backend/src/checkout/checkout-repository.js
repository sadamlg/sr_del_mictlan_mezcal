const TERMINAL_ATTEMPT_STATUSES = new Set(['FAILED', 'EXPIRED']);
const CONFIRMABLE_ORDER_STATUSES = ['PENDING', 'FAILED', 'EXPIRED'];

export function createCheckoutRepository(database) {
  return {
    async getStripeCustomerId(accountId) {
      const account = await database.account.findUnique({
        where: { id: accountId },
        select: { stripeCustomerId: true },
      });
      return account?.stripeCustomerId ?? null;
    },

    async getAccountCartForCheckout(accountId) {
      const rows = await database.accountCartItem.findMany({
        where: { accountId },
        select: {
          productId: true,
          quantity: true,
          version: true,
          updatedAt: true,
          product: {
            select: { slug: true, name: true, active: true, priceCents: true },
          },
        },
        orderBy: [{ createdAt: 'asc' }, { productId: 'asc' }],
      });
      return rows.map(({ product, ...item }) => ({ ...item, ...product }));
    },

    createPendingOrder({ accountId, recipientName, recipientEmail, shippingAddress, currency, subtotalCents, totalCents, items, createdAt }) {
      return database.$transaction((transaction) => transaction.order.create({
        data: {
          accountId,
          recipientName,
          recipientEmail,
          shippingAddress,
          status: 'PENDING',
          currency,
          subtotalCents,
          totalCents,
          createdAt,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              slug: item.slug,
              name: item.name,
              quantity: item.quantity,
              unitPriceCents: item.unitPriceCents,
              lineTotalCents: item.lineTotalCents,
              cartItemUpdatedAt: item.cartItemUpdatedAt,
              cartItemVersion: item.cartItemVersion,
            })),
          },
        },
        select: { id: true },
      }));
    },

    async attachCheckoutSession({ orderId, sessionId }) {
      const result = await database.order.updateMany({
        where: {
          id: orderId,
          OR: [{ stripeCheckoutSessionId: null }, { stripeCheckoutSessionId: sessionId }],
        },
        data: { stripeCheckoutSessionId: sessionId },
      });
      if (result.count !== 1) throw new Error('La sesión de Checkout no coincide con el pedido pendiente.');
    },

    async confirmPaidOrder({ orderId, sessionId, paymentIntentId, customerId, amountTotal, currency, paidAt }) {
      return database.$transaction(async (transaction) => {
        const order = await transaction.order.findUnique({ where: { id: orderId }, include: { items: true } });
        if (!order) throw new Error('El pedido del webhook no existe.');
        if (
          order.totalCents !== amountTotal ||
          order.currency !== currency ||
          order.stripeCheckoutSessionId !== sessionId
        ) {
          throw new Error('El total, moneda o sesión no coinciden con la instantánea del pedido.');
        }
        if (order.status === 'PAID') return { updated: false };

        const claim = await transaction.order.updateMany({
          where: {
            id: orderId,
            status: { in: CONFIRMABLE_ORDER_STATUSES },
            stripeCheckoutSessionId: sessionId,
          },
          data: {
            status: 'PAID',
            stripeCheckoutSessionId: sessionId,
            stripePaymentIntentId: paymentIntentId,
            paidAt,
          },
        });
        if (claim.count !== 1) {
          const current = await transaction.order.findUnique({ where: { id: orderId } });
          if (current?.status === 'PAID' && current.stripeCheckoutSessionId === sessionId) return { updated: false };
          throw new Error('No se pudo confirmar el estado del pedido.');
        }

        if (customerId) {
          const customerLink = await transaction.account.updateMany({
            where: { id: order.accountId, OR: [{ stripeCustomerId: null }, { stripeCustomerId: customerId }] },
            data: { stripeCustomerId: customerId },
          });
          if (customerLink.count !== 1) throw new Error('El Customer de Stripe ya está asociado a otra cuenta.');
        }

        for (const item of order.items) {
          await transaction.accountCartItem.deleteMany({
            where: {
              accountId: order.accountId,
              productId: item.productId,
              quantity: item.quantity,
              version: item.cartItemVersion,
            },
          });
        }

        return { updated: true };
      });
    },

    async closePendingOrder({ orderId, sessionId, status }) {
      if (!TERMINAL_ATTEMPT_STATUSES.has(status)) return;
      await database.order.updateMany({
        where: {
          id: orderId,
          status: 'PENDING',
          OR: [{ stripeCheckoutSessionId: null }, { stripeCheckoutSessionId: sessionId }],
        },
        data: { status, stripeCheckoutSessionId: sessionId },
      });
    },

    listPaidOrders(accountId) {
      return database.order.findMany({
        where: { accountId, status: 'PAID' },
        select: {
          id: true,
          status: true,
          currency: true,
          subtotalCents: true,
          totalCents: true,
          createdAt: true,
          paidAt: true,
          items: {
            select: {
              slug: true,
              name: true,
              quantity: true,
              unitPriceCents: true,
              lineTotalCents: true,
            },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: [{ paidAt: 'desc' }, { id: 'desc' }],
      });
    },
  };
}
