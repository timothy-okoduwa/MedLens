import { createAsyncStorage } from "@react-native-async-storage/async-storage";

export const appStorage = createAsyncStorage("app");
export const authStorage = createAsyncStorage("auth");
