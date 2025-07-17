import { apiInstance } from "./apiConfig";



function timeout(delay: number) {
  return new Promise((res) => setTimeout(res, delay));
}

const login = async (userDetails : loginFormat) => {
  try {
    console.log('[Auth] Attempting login with:', { email: userDetails.email });
    const response = await apiInstance.post("/auth/signin", userDetails);
    console.log('[Auth] Login response:', response.status, response.data);

    let token = response.data.token;
    let role = response.data.role;
    let user_id = response.data.id;

    if (token) {
      localStorage.setItem("refresh_token", token);
      localStorage.setItem("user_id", user_id);
    }
    if (role) {
      localStorage.setItem("user_role", role);
    }

    await timeout(1000);
    await getNewAccessToken();
    console.log('[Auth] Login completed successfully');
    return response.data;
  } catch (error) {
    console.error('[Auth] Login error:', error);
    console.error('[Auth] Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config
    });
    throw error;
  }
};

const signup = async (userDetails: signupFormat) => {
  const response = await apiInstance.post("/auth/signup", userDetails);
  return response.data;
};

const getUser = async (email: string) => {
  const res = await apiInstance.get(`/auth/user?email=${email}`);
  return res.data;
};

const updateUser = async(details : UpdateProfileCreds)=>{
  const res = await apiInstance.patch(`/auth/user/modify?name=${details.name}&password=${details.password}`);
  return res.data;
}

const getNewAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem("refresh_token");
    console.log('[Auth] Refreshing access token...');

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiInstance.post("/auth/refresh", {
      token: refreshToken,
    });

    console.log('[Auth] Token refresh response:', response.status);

    let token = response.data.token;
    let role = response.data.role;
    if (token) {
      localStorage.setItem("access_token", token);
    }
    if (role) {
      localStorage.setItem("user_role", role);
    }

    console.log('[Auth] Access token refreshed successfully');
    return response.data;
  } catch (error) {
    console.error('[Auth] Token refresh error:', error);
    // Clear tokens if refresh fails
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_id");
    throw error;
  }
};


export { login, signup, getNewAccessToken, getUser, updateUser };

