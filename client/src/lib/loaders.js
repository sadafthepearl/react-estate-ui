import apiRequest from "./apiRequest";

export const listPageLoader = async () => {
  try {
    const res = await apiRequest("/posts");
    return { postResponse: res && res.data ? res : { data: [] } };
  } catch (err) {
    console.error("listPageLoader unexpected error:", err);
    return { postResponse: { data: [] } };
  }
};

export const profilePageLoader = async () => {
  try {
    const [postsRes, chatsRes] = await Promise.all([
      apiRequest("/users/profilePosts").catch((e) => {
        console.error("profilePageLoader posts error:", e);
        return { data: null, status: e?.response?.status ?? 500 };
      }),
      apiRequest("/chats").catch((e) => {
        console.error("profilePageLoader chats error:", e);
        return { data: null, status: e?.response?.status ?? 500 };
      }),
    ]);

    const normalizedPostsRes =
      postsRes && postsRes.data
        ? postsRes
        : {
            data: { userPosts: [], savePosts: [] },
            status: postsRes?.status ?? 500,
          };

    const normalizedChatsRes =
      chatsRes && chatsRes.data
        ? chatsRes
        : { data: [], status: chatsRes?.status ?? 500 };

    return {
      postResponse: normalizedPostsRes,
      chatResponse: normalizedChatsRes,
    };
  } catch (err) {
    console.error("profilePageLoader error:", err);
    return {
      postResponse: { data: { userPosts: [], savePosts: [] } },
      chatResponse: { data: [] },
    };
  }
};

export const singlePageLoader = async ({ params }) => {
  try {
    const res = await apiRequest(`/posts/${params.id}`);
    return res?.data ?? null;
  } catch (err) {
    console.error("singlePageLoader error:", err);
    return null;
  }
};
