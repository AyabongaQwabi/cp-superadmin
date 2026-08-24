export function appointmentFilters(params: URLSearchParams) {
  return {
    status: params.get("status"),
    from: params.get("from"),
    to: params.get("to"),
    clinic: params.get("clinic"),
    companyId: params.get("companyId"),
    employeeId: params.get("employeeId"),
    userId: params.get("userId"),
  };
}

