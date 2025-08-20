import React, { useMemo } from 'react';

// Base URL for images - fallback to local backend if env var not set
const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || 'https://membership-model.onrender.com';

// Helper hook for handling image URLs
export const useImageUrl = () => {
	const getImageUrl = useMemo(() => {
		return (filename, type = 'profile') => {
			if (!filename) return null;
			// If filename is already a full URL, return as is
			if (filename.startsWith('http://') || filename.startsWith('https://')) {
				return filename;
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
		return (user) => {
			// Check multiple possible fields for backward compatibility
			const imageField = user?.profilePhoto || user?.profilePicture;
			return getImageUrl(imageField, 'profile');
		};
	}, [getImageUrl]);

	const getMerchantLogoUrl = useMemo(() => {
		return (merchant) => {
			const logoField = merchant?.logo;
			return getImageUrl(logoField, 'merchant');
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

// Default avatar/placeholder component
export const DefaultAvatar = ({ size = 40, className = '', name = '' }) => {
	const initials = name
		.split(' ')
		.map(word => word.charAt(0))
		.join('')
		.toUpperCase()
		.slice(0, 2);

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
				color: '#6b7280'
			}}
		>
			{initials || <i className="fas fa-user" />}
		</div>
	);
};

// Smart image component that handles loading states and fallbacks
export const SmartImage = ({ 
	src, 
	alt, 
	fallback = null, 
	className = '', 
	style = {},
	onLoad = null,
	onError = null,
	loading = 'lazy',
	...props 
}) => {
	const handleError = (e) => {
		if (fallback) {
			e.target.src = fallback;
		} else {
			e.target.style.display = 'none';
			// Show fallback element if provided
			const fallbackElement = e.target.nextElementSibling;
			if (fallbackElement && fallbackElement.classList.contains('image-fallback')) {
				fallbackElement.style.display = 'flex';
			}
		}
		onError && onError(e);
	};

	return (
		<>
			<img
				src={src}
				alt={alt}
				className={className}
				style={style}
				onLoad={onLoad}
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
						...style
					}}
				>
					<i className="fas fa-image" />
				</div>
			)}
		</>
	);
};

export default useImageUrl;
