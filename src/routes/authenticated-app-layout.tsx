import { useLoaderData } from 'react-router-dom';
import AppLayout from '@/components/app-layout/app-layout';
import type { IGetUserRes } from '@/components/login/login-service';

const AuthenticatedAppLayout = () => {
    const user = useLoaderData() as IGetUserRes;
    return <AppLayout user={user} />;
};

export default AuthenticatedAppLayout;
