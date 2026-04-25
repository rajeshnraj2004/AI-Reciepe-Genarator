const BASE_URL = "http://YOUR_IP:5000"; // 🔥 change this

export const googleAuth = async (userInfo: any) => {
  try {
    const res = await fetch(`${BASE_URL}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: userInfo.user.name,
        email: userInfo.user.email,
        photo: userInfo.user.photo,
      }),
    });

    return await res.json();
  } catch (error) {
    console.log(error);
  }
};