import React, {useState, useMemo } from 'react';

// Base URL for images - fallback to current origin if env var not set
// const IMAGE_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 
//                       import.meta.env.VITE_DOMAIN_URL || 
//                       'https://membership-model.onrender.com';

const IMAGE_BASE_URL = import.meta.env.VITE_DOMAIN_URL || 
                       process.env.VITE_DOMAIN_URL || 
                       'https://membership.indiansinghana.com'; 

// Helper hook for handling image URLs
export const useImageUrl = () => {
    const getImageUrl = useMemo(() => {
    return (filename, type = 'profile') => {
        if (!filename) return null;
        
        // If filename is already a full URL, return as is
        if (filename.startsWith('http://') || filename.startsWith('https://')) {
        return filename;
        }
        
        // Auto-prepend https:// only if it looks like a proper domain (not a filename)
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const isImageFile = imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
        
        if (filename.includes('.') && !filename.startsWith('/') && !isImageFile) {
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
            const imageField = user?.profilePhoto || user?.profilePicture;

            // Return full URL if available
            if (imageField && (imageField.startsWith('http://') || imageField.startsWith('https://'))) {
                return imageField;
            }
            
            if (imageField) return getImageUrl(imageField, 'profile');
            }
            
            // If it's a string (image field directly), use it
            if (typeof userOrImageField === 'string' && userOrImageField) {
            // Return full URL if it's a complete URL
            if (userOrImageField.startsWith('http://') || userOrImageField.startsWith('https://')) {
                return userOrImageField;
            }
            return getImageUrl(userOrImageField, 'profile');
            }
            
            // Fallback to localStorage for persistent images
            if (userId) {
            try {
                const userData = localStorage.getItem('user_data');
                if (userData) {
                const parsed = JSON.parse(userData);
                const imageField = parsed.profilePhotoUrl || parsed.profilePicture || parsed.profilePhoto;
                
                // Return full URL if available
                if (imageField && (imageField.startsWith('http://') || imageField.startsWith('https://'))) {
                    return imageField;
                }
                
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
            
            // Debug logging
            console.log('🔍 getMerchantLogoUrl input:', merchantOrBusiness);
            
            let logoField = null;
            
            // For merchants, check user.profilePhoto first (since that's where merchant logos are stored)
            if (merchantOrBusiness.userType === 'merchant' || merchantOrBusiness.business) {
            // If it's a merchant user object with profilePhoto
            logoField = merchantOrBusiness.profilePhoto || merchantOrBusiness.profilePicture;
            
            // If it has business data nested, check business logo
            if (!logoField && merchantOrBusiness.business) {
                logoField = merchantOrBusiness.business.logo || merchantOrBusiness.business.logoUrl;
            }
            } else {
            // For business objects from /businesses API, check logo fields (which now map to profilePhoto)
            logoField = merchantOrBusiness.logo || merchantOrBusiness.logoUrl || merchantOrBusiness.merchantLogo;
            }
            
            console.log('🖼️ Found logo field:', logoField);

            // Normalize cases where backend returned a path instead of just a filename
            if (typeof logoField === 'string' && logoField.includes('/')) {
                try {
                    const normalized = logoField.replace(/\\\\/g, '/');
                    const uploadsIndex = normalized.indexOf('/uploads/');
                    if (uploadsIndex !== -1) {
                        const parts = normalized.split('/');
                        logoField = parts[parts.length - 1];
                    } else {
                        // If it contains directories like 'merchant_logos' or 'profile_photos', extract basename
                        const parts = normalized.split('/');
                        logoField = parts[parts.length - 1];
                    }
                } catch (e) {
                    console.warn('Error normalizing logo field:', e);
                }
            }
            
            if (logoField && (logoField.startsWith('http://') || logoField.startsWith('https://'))) {
            console.log('✅ Returning full URL:', logoField);
            return logoField;
            }
            
            const finalUrl = logoField ? getImageUrl(logoField, 'merchant') : null; // Use 'merchant' since it's stored as profilePhoto
            console.log('🎯 Final constructed URL:', finalUrl);
            return finalUrl;
        };
        }, [getImageUrl]);


        const getDealBannerUrl = useMemo(() => {
        return (deal) => {
            if (!deal) return null;
            
            // Check multiple possible field names for backward compatibility
            let bannerField = deal?.bannerImage || deal?.banner || deal?.imageUrl || '';
            if (!bannerField) return null;

            // If it's already a full URL, return as is
            if (bannerField.startsWith('http://') || bannerField.startsWith('https://')) {
                return bannerField;
            }

            // Handle cases where backend stored a path (e.g., '/uploads/deal_banners/filename' or '/public_html/uploads/deal_banners/filename')
            try {
                // Normalize and extract filename if necessary
                const normalized = bannerField.replace(/\\\\/g, '/');
                const uploadsIndex = normalized.indexOf('/uploads/');
                if (uploadsIndex !== -1) {
                    // Get the portion after the last slash
                    const parts = normalized.split('/');
                    const basename = parts[parts.length - 1];
                    if (basename) {
                        return getImageUrl(basename, 'deal');
                    }
                }

                // If it contains 'deal_banners' directory anywhere, extract basename
                if (normalized.includes('deal_banners')) {
                    const parts = normalized.split('/');
                    const basename = parts[parts.length - 1];
                    if (basename) {
                        return getImageUrl(basename, 'deal');
                    }
                }
            } catch (e) {
                console.warn('Error normalizing bannerField:', e);
            }
            
            // Fallback to default behavior
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
            {currentSrc ? (
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
            ) : (
                // Exact fallback markup requested
                <div className="image-fallback" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgb(243, 244, 246)', color: 'rgb(156, 163, 175)', fontSize: '14px', borderRadius: '8px'}}>
                    {placeholder || <div className="logo-placeholder"><span>P</span></div>}
                </div>
            )}
        </>
    );
};

export default useImageUrl;
