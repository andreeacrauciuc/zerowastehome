let activeFcmToken = null;

export const setActiveFcmToken = (token) => {
  activeFcmToken = token || null;
};

export const getActiveFcmToken = () => activeFcmToken;

export const clearActiveFcmToken = () => {
  activeFcmToken = null;
};
