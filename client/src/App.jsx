
import { RouterProvider } from "react-router-dom";
import router from "./app/router.jsx";
import Providers from "./app/providers.jsx";

export default function App() {
    return (
        <Providers>
            <RouterProvider router={router} />
        </Providers>
    );
}
