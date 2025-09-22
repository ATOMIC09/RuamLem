"use client";

import { useEffect, useState } from "react";

interface User {
    id: number;
    name: string;
    email: string;
}

export const useAuth = () => {
    const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
    const [user, setUser] = useState<User | null>(null);
    
    useEffect(() => {
        // Mock check - replace with your actual authentication logic
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
            setIsSignedIn(true);
        } else {
            setIsSignedIn(false);
        }
    }, []);

    const signOut = () => {
        localStorage.removeItem('user');
        setUser(null);
        setIsSignedIn(false);
    };

    const signIn = (userData: User) => {
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsSignedIn(true);
    };

    return { 
        isSignedIn, 
        user, 
        signOut, 
        signIn,
        isLoading: isSignedIn === null 
    };
};