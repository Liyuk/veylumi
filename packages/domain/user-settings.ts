export type UserLanguage = "zh-CN" | "en-US";

export type SharedUserSettings = {
  language: UserLanguage;
  savePhotosByDefault: boolean;
  personalizedTutorials: boolean;
};
