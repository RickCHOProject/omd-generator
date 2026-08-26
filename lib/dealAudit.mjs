const staffIdentity = (session) => ({
  id: String(session?.sub || 'unknown').slice(0, 80),
  name: String(session?.name || session?.sub || 'Unknown').slice(0, 80)
});

export const auditNewDealData = (data, session, timestamp = new Date().toISOString()) => {
  const staff = staffIdentity(session);
  return {
    ...data,
    audit: {
      createdBy: staff.name,
      createdById: staff.id,
      createdAt: timestamp,
      lastUpdatedBy: staff.name,
      lastUpdatedById: staff.id,
      lastUpdatedAt: timestamp
    }
  };
};

export const auditUpdatedDealData = (nextData, existingData, session, timestamp = new Date().toISOString()) => {
  const staff = staffIdentity(session);
  const existingAudit = existingData?.audit || {};
  return {
    ...nextData,
    audit: {
      createdBy: existingAudit.createdBy || 'Unknown',
      createdById: existingAudit.createdById || 'unknown',
      createdAt: existingAudit.createdAt || '',
      lastUpdatedBy: staff.name,
      lastUpdatedById: staff.id,
      lastUpdatedAt: timestamp
    }
  };
};
