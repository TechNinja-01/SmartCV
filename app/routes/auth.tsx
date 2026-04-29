import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { usePuterStore } from '~/lib/puter';

export const meta = () => [
  { title: 'SmartCV | Auth' },
  { name: 'description', content: 'Log in to continue your job journey' },
];

const auth = () => {
    const {isLoading, auth} = usePuterStore();
    const location = useLocation();
    const navigate = useNavigate();
    const next = new URLSearchParams(location.search).get('next') || '/';

    useEffect(() => {
        if (auth.isAuthenticated) {
            navigate(next);
        }
    }, [auth.isAuthenticated, next, navigate]);

  return (
    <main className={`bg-[url('/images/bg-main.svg')] bg-cover min-h-screen flex items-center justify-center`}>
        <div className='gradient-border shadow-lg'>
            <section className='flex flex-col gap-8 bg-white dark:bg-gray-900 rounded-2xl p-10 border border-transparent dark:border-gray-800'>
                <div className='flex flex-col items-center gap-2 text-center'>
                    <h1>Welcome</h1>
                    <h2>Log In to Continue your Job Journey</h2>
                </div>
                <div>
                    {isLoading?(
                        <button className='auth-bottom animate-pulse'>
                            <p>Signing you in...</p>
                        </button>
                    ) : (
                        <>
                        {auth.isAuthenticated?(
                            <button className='auth-button' onClick={auth.signOut}>
                                <p>Log Out</p>
                            </button>
                        ):(
                            <button className='auth-button' onClick={auth.signIn}>
                                <p>Log In</p>
                            </button>
                        )}
                        </>
                    )}
                </div>
            </section>
        </div>
    </main>
  )
}

export default auth