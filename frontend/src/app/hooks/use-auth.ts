"use client";

import { useEffect, useState } from "react";
import { getAuthToken, removeAuthToken, setAuthToken } from "@/lib/api";
import * as authService from "@/services/auth.service";

interface User {
    id: string;  // Changed from number to string (UUID)
    name: string;
    email: string;
    firstName?: string;
    lastName?: string;
    userRole?: string;
}

// Create a custom event for auth state changes
const AUTH_CHANGE_EVENT = 'auth-state-changed';

// Helper to trigger auth state change
const triggerAuthChange = () => {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
};

export const useAuth = () => {
    const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
    const [user, setUser] = useState<User | null>(null);
    
    // Function to check and update auth state
    const checkAuthState = () => {
        const token = getAuthToken();
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
            try {
                const parsedUser = JSON.parse(userData);
                // Only update if user data actually changed
                setUser(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(parsedUser)) {
                        return parsedUser;
                    }
                    return prev;
                });
                setIsSignedIn(true);
            } catch {
                // Invalid user data, clear everything
                removeAuthToken();
                localStorage.removeItem('user');
                setUser(null);
                setIsSignedIn(false);
            }
        } else {
            setUser(null);
            setIsSignedIn(false);
        }
    };

    useEffect(() => {
        // Check auth state on mount
        checkAuthState();

        // Listen for auth state changes from other components
        window.addEventListener(AUTH_CHANGE_EVENT, checkAuthState);

        // Listen for storage changes (cross-tab or rapid updates)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'user' || e.key === 'auth_token') {
                checkAuthState();
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // Also check when window gains focus (ensures navbar updates after navigation)
        window.addEventListener('focus', checkAuthState);

        // Polling as fallback to catch any missed updates (check every 500ms)
        const pollInterval = setInterval(checkAuthState, 500);

        return () => {
            window.removeEventListener(AUTH_CHANGE_EVENT, checkAuthState);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('focus', checkAuthState);
            clearInterval(pollInterval);
        };
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
            // Trigger auth change event for other components
            triggerAuthChange();
        }
    };

    const signIn = (userData: User, token?: string) => {
        localStorage.setItem('user', JSON.stringify(userData));
        if (token) {
            setAuthToken(token);
        }
        setUser(userData);
        setIsSignedIn(true);
        // Trigger auth change event for other components
        triggerAuthChange();
    };

    return { 
        isSignedIn, 
        user, 
        signOut, 
        signIn,
        isLoading: isSignedIn === null 
    };
};