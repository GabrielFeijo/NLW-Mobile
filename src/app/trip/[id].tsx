import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Loading } from '@/components/loading';
import { TripDetails, tripServer } from '@/server/trip-server';
import { colors } from '@/styles/colors';
import dayjs from 'dayjs';
import { router, useLocalSearchParams } from 'expo-router';
import {
	Calendar as CalendarIcon,
	CalendarRange,
	Info,
	MapPin,
	Settings2,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Keyboard, TouchableOpacity, View, Text } from 'react-native';
import { Activities } from './activities';
import { Details } from './details';
import { Modal } from '@/components/modal';
import { Calendar } from '@/components/calendar';
import { DateData } from 'react-native-calendars';
import { DatesSelected, calendarUtils } from '@/utils/calendarUtils';
import { tripStorage } from '@/storage/trip';

export type TripData = TripDetails & { when: string };

enum Option {
	ACTIVITY = 0,
	DETAILS = 1,
}

enum ModalOption {
	NONE = 0,
	UPDATE_TRIP = 1,
	CALENDAR = 2,
}

export default function Trip() {
	const [isLoadingTrip, setIsLoadingTrip] = useState(true);
	const [isUpdatingTrip, setIsUpdatingTrip] = useState(false);

	const [tripDetails, setTripDetails] = useState<TripData>();
	const [destination, setDestination] = useState<string>();

	const [selectedDates, setSelectedDates] = useState<DatesSelected>();

	const [showModal, setShowModal] = useState<ModalOption>(ModalOption.NONE);
	const [option, setOption] = useState<Option>(Option.ACTIVITY);

	const { id: tripId } = useLocalSearchParams<{ id: string }>();

	function handleSelectedDate(selectedDay: DateData) {
		const dates = calendarUtils.orderStartsAtAndEndsAt({
			startsAt: selectedDates?.startsAt,
			endsAt: selectedDates?.endsAt,
			selectedDay,
		});

		setSelectedDates(dates);
	}

	async function getTripDetails() {
		try {
			if (!tripId) {
				return router.back();
			}
			const trip = await tripServer.getById(tripId);

			const maxLengthDestination = 14;
			const destination =
				trip?.destination.length > maxLengthDestination
					? `${trip?.destination.slice(0, maxLengthDestination)}...`
					: trip?.destination;

			const starts_at = dayjs(trip?.starts_at).format('DD');
			const ends_at = dayjs(trip?.ends_at).format('DD');
			const month = dayjs(trip?.starts_at).format('MMMM');

			setDestination(trip.destination);
			setTripDetails({
				...trip,
				when: `${destination} de ${starts_at} a ${ends_at} de ${month}.`,
			});
		} catch (error) {
			Alert.alert('Erro ao buscar viagem', 'Por favor, tente novamente.');
		} finally {
			setIsLoadingTrip(false);
		}
	}

	async function handleUpdateTrip() {
		try {
			if (!tripId) {
				return;
			}

			if (!destination || !selectedDates?.startsAt || !selectedDates?.endsAt) {
				return Alert.alert(
					'Detalhes da viagem',
					'Por favor, preencha todos os dados da viagem.'
				);
			}

			setIsUpdatingTrip(true);
			const { trip } = await tripServer.update({
				id: tripId,
				destination,
				starts_at: dayjs(selectedDates?.startsAt?.dateString).toString(),
				ends_at: dayjs(selectedDates?.endsAt?.dateString).toString(),
			});

			const maxLengthDestination = 14;
			const destinationUpdated =
				trip?.destination.length > maxLengthDestination
					? `${trip?.destination.slice(0, maxLengthDestination)}...`
					: trip?.destination;

			const starts_at = dayjs(trip?.starts_at).format('DD');
			const ends_at = dayjs(trip?.ends_at).format('DD');
			const month = dayjs(trip?.starts_at).format('MMMM');

			setDestination(trip.destination);
			setTripDetails({
				...trip,
				when: `${destinationUpdated} de ${starts_at} a ${ends_at} de ${month}.`,
			});

			setShowModal(ModalOption.NONE);
		} catch (error) {
			Alert.alert('Erro ao atualizar viagem', 'Por favor, tente novamente.');
		} finally {
			setIsUpdatingTrip(false);
		}
	}

	async function handleRemoveTrip() {
		try {
			Alert.alert('Remover viagem', 'Tem certeza que deseja remover a viagem', [
				{
					text: 'Não',
					style: 'cancel',
				},
				{
					text: 'Sim',
					onPress: async () => {
						await tripStorage.remove();
						router.navigate('/');
					},
				},
			]);
		} catch (error) {
			console.log(error);
		}
	}

	useEffect(() => {
		async function fetchTrip() {
			await getTripDetails();
		}
		fetchTrip();
	}, []);

	if (isLoadingTrip || !tripDetails) {
		return <Loading />;
	}

	return (
		<View className='flex-1 px-5 pt-16'>
			<Input variant='tertiary'>
				<MapPin
					size={20}
					color={colors.zinc[400]}
				/>
				<Input.Field
					value={tripDetails?.when}
					readOnly
				/>

				<TouchableOpacity
					activeOpacity={0.6}
					className='size-9 bg-zinc-800 items-center justify-center rounded'
					onPress={() => setShowModal(ModalOption.UPDATE_TRIP)}
				>
					<Settings2
						color={colors.zinc[400]}
						size={20}
					/>
				</TouchableOpacity>
			</Input>

			{option === Option.ACTIVITY ? (
				<Activities tripDetails={tripDetails} />
			) : (
				<Details tripId={tripDetails.id} />
			)}

			<View className='w-full absolute -bottom-1 self-center justify-end pb-5 z-10 bg-zinc-950'>
				<View className='w-full flex-row bg-zinc-900 p-4 rounded-lg border border-zinc-800 gap-2'>
					<Button
						className='flex-1'
						variant={option === Option.ACTIVITY ? 'primary' : 'secondary'}
						onPress={() => setOption(Option.ACTIVITY)}
					>
						<CalendarRange
							size={20}
							color={
								option === Option.ACTIVITY ? colors.lime[950] : colors.zinc[400]
							}
						/>
						<Button.Title>Atividades</Button.Title>
					</Button>

					<Button
						className='flex-1'
						variant={option === Option.DETAILS ? 'primary' : 'secondary'}
						onPress={() => setOption(Option.DETAILS)}
					>
						<Info
							size={20}
							color={
								option === Option.DETAILS ? colors.lime[950] : colors.zinc[400]
							}
						/>
						<Button.Title>Detalhes</Button.Title>
					</Button>
				</View>
			</View>

			<Modal
				title='Atualizar viagem'
				subtitle='Somente quem criou a viagem pode editar.'
				visible={showModal === ModalOption.UPDATE_TRIP}
				onClose={() => setShowModal(ModalOption.NONE)}
			>
				<View className='gap-2 my-4'>
					<Input variant='secondary'>
						<MapPin
							size={20}
							color={colors.zinc[400]}
						/>
						<Input.Field
							placeholder='Para onde?'
							value={destination}
							onChangeText={setDestination}
						/>
					</Input>

					<Input variant='secondary'>
						<CalendarIcon
							size={20}
							color={colors.zinc[400]}
						/>
						<Input.Field
							placeholder='Quando?'
							onPressIn={() => setShowModal(ModalOption.CALENDAR)}
							value={selectedDates?.formatDatesInText}
							onFocus={() => Keyboard.dismiss()}
							showSoftInputOnFocus={false}
						/>
					</Input>

					<Button
						className='w-full'
						onPress={handleUpdateTrip}
						isLoading={isUpdatingTrip}
					>
						<Button.Title>Atualizar</Button.Title>
					</Button>

					<TouchableOpacity
						activeOpacity={0.8}
						onPress={handleRemoveTrip}
					>
						<Text className='text-red-400 text-center mt-6'>
							Remover viagem
						</Text>
					</TouchableOpacity>
				</View>
			</Modal>

			<Modal
				title='Selecionar datas'
				subtitle='Selecione as datas de início e fim da sua viagem'
				visible={showModal === ModalOption.CALENDAR}
				onClose={() => setShowModal(ModalOption.NONE)}
			>
				<View className='gap-4 mt-4'>
					<Calendar
						onDayPress={handleSelectedDate}
						markedDates={selectedDates?.dates}
						minDate={dayjs().toISOString()}
					/>
					<Button onPress={() => setShowModal(ModalOption.UPDATE_TRIP)}>
						<Button.Title>Confirmar</Button.Title>
					</Button>
				</View>
			</Modal>
		</View>
	);
}
