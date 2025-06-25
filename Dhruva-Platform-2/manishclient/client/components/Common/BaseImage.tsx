import Image from "next/image";
import { ImageProps } from "next/image";

/**
 * Base Image component that handles base path automatically
 * This component wraps Next.js Image and ensures proper asset loading with base path
 */
interface BaseImageProps extends Omit<ImageProps, 'src'> {
  src: string;
}

const BaseImage: React.FC<BaseImageProps> = ({ src, ...props }) => {
  // For Next.js with basePath, static assets need to be prefixed manually
  let imageSrc = src;

  // Ensure the src starts with /
  if (!imageSrc.startsWith('/')) {
    imageSrc = `/${imageSrc}`;
  }

  // Add the base path manually for static assets
  imageSrc = `/dhruva${imageSrc}`;

  return <Image src={imageSrc} {...props} />;
};

export default BaseImage;
