import { createContext } from "react";
import { SSRComposeContextProps } from "./ssr-compose.type";

export const SSRComposeContext = createContext<SSRComposeContextProps>({} as any)