import { API } from "./Api";
import { components as ApiComponents } from "./PublicAPI";
type ApiSchemas = ApiComponents["schemas"];
type UserInfo = ApiSchemas["User.PublicInfo"];

export const userFromMaybeId = async (
  id: string | number,
): Promise<UserInfo> => {
  if (typeof id === "string") {
    return {
      id: -1,
      username: id,
    };
  }
  const resp = await API.fetch(`/users/id/${id}`);
  if (resp.ok || resp.status === 304) return await resp.json();
  return {
    id: id,
    username: "unknown user",
  };
};
