"use client";

export default function ProtectedLayout({ children }) {
  return <>{children}</>;
}

// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import axios from "axios";

// export default function ProtectedLayout({ children }) {
//   const router = useRouter();
//   const [loading, setLoading] = useState(true);
//   const [authorized, setAuthorized] = useState(false);

//   useEffect(() => {
//     const checkAuth = async () => {
//       try {
//         const res = await axios.get("/api/profile/my-profile", {
//           withCredentials: true,
//         });

//         if (res.data?.user) {
//           setAuthorized(true);
//         } else {
//           router.replace("/");
//         }
//       } catch (err) {
//         router.replace("/");
//       } finally {
//         setLoading(false);
//       }
//     };

//     checkAuth();
//   }, [router]);

//   if (!authorized) {
//     return null;
//   }

//   return <>{children}</>;
// }
