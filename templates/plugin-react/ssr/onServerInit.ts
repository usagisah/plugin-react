import { AlbumContext } from "@w-hite/album/server";
import { SSRServerContext } from "./SSRServerContext";

export function onServerInit(ctx: AlbumContext) {
  SSRServerContext.setContext(ctx)
}