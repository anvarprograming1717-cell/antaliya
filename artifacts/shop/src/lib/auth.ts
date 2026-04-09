export const getCustomerSession = () => {
  const customerId = localStorage.getItem("customerId");
  const customerPhone = localStorage.getItem("customerPhone");
  const customerName = localStorage.getItem("customerName");
  
  if (!customerId) return null;
  return {
    id: parseInt(customerId, 10),
    phone: customerPhone || "",
    name: customerName || "",
  };
};

export const setCustomerSession = (customer: { id: number; phone: string; name?: string | null }) => {
  localStorage.setItem("customerId", customer.id.toString());
  localStorage.setItem("customerPhone", customer.phone);
  if (customer.name) {
    localStorage.setItem("customerName", customer.name);
  }
};

export const clearCustomerSession = () => {
  localStorage.removeItem("customerId");
  localStorage.removeItem("customerPhone");
  localStorage.removeItem("customerName");
};

export const getAdminSession = () => {
  return localStorage.getItem("isAdmin") === "true";
};

export const setAdminSession = () => {
  localStorage.setItem("isAdmin", "true");
};

export const clearAdminSession = () => {
  localStorage.removeItem("isAdmin");
};
