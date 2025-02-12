import clsx from 'clsx';
import { createContext, useContext } from 'react';
import {
	Text,
	TouchableOpacity,
	TouchableOpacityProps,
	TextProps,
	ActivityIndicator,
} from 'react-native';
import { Loading } from './loading';

type Variants = 'primary' | 'secondary';

type ButtonProps = TouchableOpacityProps & {
	variant?: Variants;
	isLoading?: boolean;
};

const ThemeContext = createContext<{ variant?: Variants }>({});

function Button({
	variant = 'primary',
	isLoading,
	children,
	className,
	...props
}: ButtonProps) {
	return (
		<TouchableOpacity
			className={clsx(
				'h-11 flex-row items-center justify-center rounded-lg gap-2 px-2',
				{
					'bg-lime-300': variant === 'primary',
					'bg-zinc-800': variant === 'secondary',
				},
				className
			)}
			activeOpacity={0.7}
			disabled={isLoading}
			{...props}
		>
			<ThemeContext.Provider value={{ variant }}>
				{isLoading ? <ActivityIndicator className='text-lime-950' /> : children}
			</ThemeContext.Provider>
		</TouchableOpacity>
	);
}

function Title({ ...props }: TextProps) {
	const { variant } = useContext(ThemeContext);
	return (
		<Text
			className={clsx('text-base font-semibold', {
				'text-lime-950': variant === 'primary',
				'text-zinc-200': variant === 'secondary',
			})}
			{...props}
		/>
	);
}

Button.Title = Title;

export { Button };
