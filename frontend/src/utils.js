export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validatePhone = (phone) =>
  /^[0-9]{9,15}$/.test(phone.replace(/\D/g, ""));

export const validateBloodType = (type) =>
  ["+O", "-O", "+A", "-A", "+B", "-B", "+AB", "-AB"].includes(type);

export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString("ar-SA");
};

export const calculateProgress = (collected, needed) =>
  Math.min((collected / needed) * 100, 100);

export const getUrgencyColor = (urgency) => {
  const colors = {
    urgent: "#ec2750",
    normal: "#8a7a7a",
    low: "#26a852",
  };
  return colors[urgency] || colors.normal;
};
