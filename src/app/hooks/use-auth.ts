"use client";

import { useEffect, useState } from "react";
import { getAuthToken, removeAuthToken, setAuthToken } from "@/lib/api";
import * as authService from "@/services/auth.service";

interface User {
    id: number;
    name: string;
    email: string;
    firstName?: string;
    lastName?: string;
}

export const useAuth = () => {
    const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
    const [user, setUser] = useState<User | null>(null);
    
    useEffect(() => {
        // Check if user is authenticated
        const token = getAuthToken();
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
            try {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                setIsSignedIn(true);
            } catch {
                // Invalid user data, clear everything
                removeAuthToken();
                localStorage.removeItem('user');
                setIsSignedIn(false);
            }
        } else {
            setIsSignedIn(false);
        }
    }, []);

    const signOut = async () => {
        try {
            await authService.signOut();
        } catch (error) {
            console.error('Sign out error:', error);
        } finally {
            localStorage.removeItem('user');
            setUser(null);
            setIsSignedIn(false);
        }
    };

    const signIn = (userData: User, token?: string) => {
        localStorage.setItem('user', JSON.stringify(userData));
        if (token) {
            setAuthToken(token);
        }
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