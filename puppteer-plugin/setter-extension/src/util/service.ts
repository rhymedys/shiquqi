export const sendMessage = (data: any) => {
  const api = window._dbhound_send_data;
  api(JSON.stringify(data));
};

export const sendChromeMessage = async (type: string, message?: string) => {
  return await chrome.runtime.sendMessage({
    type: type,
    message: message,
  });
};
