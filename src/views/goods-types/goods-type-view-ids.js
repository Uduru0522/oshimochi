export function getGoodsTypeItemsViewId(goodsTypeId) {
  return `goods:${goodsTypeId}`;
}

export function getGoodsTypeOverviewViewId(goodsTypeId) {
  return `${getGoodsTypeItemsViewId(goodsTypeId)}:overview`;
}
