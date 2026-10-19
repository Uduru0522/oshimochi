function summarizeLifecycleRecords(records) {
  const deleted = records.filter(({ isDeleted }) => isDeleted).length;

  return {
    active: records.length - deleted,
    deleted,
    total: records.length
  };
}

export function createSnapshotSummary(snapshot) {
  return {
    application: snapshot.application,
    assetBytes: snapshot.data.assets.reduce(
      (total, asset) => total + asset.byteSize,
      0
    ),
    counts: {
      dashboardCards: { total: snapshot.data.dashboardCards?.length ?? 0 },
      assets: { total: snapshot.data.assets.length },
      fieldDefinitions: summarizeLifecycleRecords(
        snapshot.data.fieldDefinitions
      ),
      goodsTypes: summarizeLifecycleRecords(snapshot.data.goodsTypes),
      items: summarizeLifecycleRecords(snapshot.data.items)
    },
    createdAt: snapshot.createdAt,
    domainModelVersion: snapshot.domainModelVersion,
    exportFormatVersion: snapshot.exportFormatVersion,
    snapshotId: snapshot.snapshotId
  };
}
