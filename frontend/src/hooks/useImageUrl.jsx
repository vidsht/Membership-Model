import React, { useMemo } from 'react';

// Base URL for images - fallback to current origin if env var not set
const IMAGE_BASE_URL = import.meta.env.VITE_DOMAIN_URL || import.meta.env.VITE_IMAGE_BASE_URL || import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://membership-model.onrender.com');

// Helper hook for handling image URLs
export const useImageUrl = () => {
    const getImageUrl = useMemo(() => {
        return (filename, type = 'profile') => {
            if (!filename) return null;
            // If filename is already a full URL, return as is
            if (filename.startsWith('http://') || filename.startsWith('https://')) {
                return filename;
            }
            // Auto-prepend https:// if it looks like a domain but missing protocol
            if (filename.includes('.') && !filename.startsWith('/')) {
                return `https://${filename}`;
            }
            // Map types to their respective directories
            const typeDirectories = {
                profile: '/uploads/profile_photos/',
                merchant: '/uploads/merchant_logos/',
                deal: '/uploads/deal_banners/'
            };
            const directory = typeDirectories[type] || '/uploads/';
            return `${IMAGE_BASE_URL}${directory}${filename}`;
        };
    }, []);

    const getProfileImageUrl = useMemo(() => {
        return (userOrImageField, userId) => {
            // If first param is a user object, extract the image field
            if (typeof userOrImageField === 'object' && userOrImageField !== null) {
                const user = userOrImageField;
                const imageField = user?.profilePhoto || user?.profilePicture || user?.profilePhotoUrl;
                if (imageField) return getImageUrl(imageField, 'profile');
            }
            // If it's a string (image field directly), use it
            if (typeof userOrImageField === 'string' && userOrImageField) {
                return getImageUrl(userOrImageField, 'profile');
            }
            // Fallback to localStorage for persistent images
            if (userId) {
                try {
                    const userData = localStorage.getItem('user_data');
                    if (userData) {
                        const parsed = JSON.parse(userData);
                        const imageField = parsed.profilePicture || parsed.profilePhoto || parsed.profilePhotoUrl;
                        if (imageField) return getImageUrl(imageField, 'profile');
                    }
                } catch (e) {
                    console.error('Error loading persisted profile image:', e);
                }
            }
            return null;
        };
    }, [getImageUrl]);

    const getMerchantLogoUrl = useMemo(() => {
        return (merchantOrBusiness) => {
            if (!merchantOrBusiness) return null;
            
            let logoField = null;
            
            // Handle different data structures
            if (typeof merchantOrBusiness === 'object') {
                // Try direct logo fields first (from your updated API)
                logoField = merchantOrBusiness.merchantLogo || 
                           merchantOrBusiness.logoUrl || 
                           merchantOrBusiness.logo;
                
                // If no direct logo, check nested business object
                if (!logoField && merchantOrBusiness.business) {
                    try {
                        const businessData = typeof merchantOrBusiness.business === 'string' 
                            ? JSON.parse(merchantOrBusiness.business) 
                            : merchantOrBusiness.business;
                        logoField = businessData?.logo || businessData?.logoUrl;
                    } catch (e) {
                        console.error('Error parsing business data in getMerchantLogoUrl:', e);
                    }
                }
            }
            
            // If string is provided, treat as direct logo URL
            if (typeof merchantOrBusiness === 'string') {
                logoField = merchantOrBusiness;
            }
            
            return logoField ? getImageUrl(logoField, 'merchant') : null;
        };
    }, [getImageUrl]);

    const getDealBannerUrl = useMemo(() => {
        return (deal) => {
            // Check both bannerImage and imageUrl for backward compatibility
            const bannerField = deal?.bannerImage || deal?.imageUrl;
            return getImageUrl(bannerField, 'deal');
        };
    }, [getImageUrl]);

    return {
        getImageUrl,
        getProfileImageUrl,
        getMerchantLogoUrl,
        getDealBannerUrl
    };
};

// Enhanced Default avatar/placeholder component with memoized initials
export const DefaultAvatar = ({ size = 40, className = '', name = '' }) => {
    const initials = useMemo(() => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }, [name]);

    return (
        <div 
            className={`default-avatar ${className}`}
            style={{
                width: size,
                height: size,
                backgroundColor: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: size * 0.4,
                fontWeight: '600',
                color: '#6b7280',
                borderRadius: '50%'
            }}
        >
            {initials || <i className="fas fa-user" />}
        </div>
    );
};

// Enhanced Smart image component with retry logic and custom placeholder support
export const SmartImage = ({ 
    src, 
    alt, 
    fallback = null, 
    placeholder = null, // New prop for custom placeholder JSX
    className = '', 
    style = {},
    onLoad = null,
    onError = null,
    loading = 'lazy',
    maxRetries = 2, // New prop for configurable retry attempts
    ...props 
}) => {
    const [retryCount, setRetryCount] = React.useState(0);
    const [currentSrc, setCurrentSrc] = React.useState(src);

    // Reset retry count when src changes
    React.useEffect(() => {
        setRetryCount(0);
        setCurrentSrc(src);
    }, [src]);

    const handleError = (e) => {
        const img = e.target;
        
        // Try alternate host if available and retries remain
        if (retryCount < maxRetries) {
            const altBase = import.meta.env.VITE_IMAGE_BASE_URL || import.meta.env.VITE_API_URL || window.location.origin;
            try {
                const currentImgSrc = img.src;
                if (currentImgSrc && (currentImgSrc.startsWith('http://') || currentImgSrc.startsWith('https://'))) {
                    try {
                        const parsed = new URL(currentImgSrc);
                        const altSrc = altBase.replace(/\/$/, '') + parsed.pathname;
                        
                        // Prevent setting same src and increment retry
                        if (altSrc !== currentImgSrc) {
                            setRetryCount(prev => prev + 1);
                            setCurrentSrc(altSrc);
                            return; // Wait for new load/error
                        }
                    } catch (urlErr) {
                        console.error('URL parsing error:', urlErr);
                    }
                }
            } catch (err) {
                console.error('Retry attempt error:', err);
            }
        }

        // All retries exhausted, show fallback
        if (fallback) {
            setCurrentSrc(fallback);
        } else {
            img.style.display = 'none';
            // Show custom placeholder or fallback element
            const placeholderElement = img.parentNode.querySelector('.image-fallback');
            if (placeholderElement) {
                placeholderElement.style.display = 'flex';
            }
        }
        
        onError && onError(e);
    };

    const handleLoad = (e) => {
        // Reset retry count on successful load
        setRetryCount(0);
        onLoad && onLoad(e);
    };

    return (
        <>
            <img
                src={currentSrc}
                alt={alt}
                className={className}
                style={style}
                onLoad={handleLoad}
                onError={handleError}
                loading={loading}
                {...props}
            />
            {!fallback && (
                <div 
                    className="image-fallback"
                    style={{
                        display: 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f3f4f6',
                        color: '#9ca3af',
                        fontSize: '14px',
                        borderRadius: '8px',
                        ...style
                    }}
                >
                    {placeholder || <i className="fas fa-image" />}
                </div>
            )}
        </>
    );
};

export default useImageUrl;
