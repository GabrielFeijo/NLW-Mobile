import { Button } from '@/components/button';
import { Calendar } from '@/components/calendar';
import { GuestEmail } from '@/components/email';
import { Input } from '@/components/input';
import { Modal } from '@/components/modal';
import { tripServer } from '@/server/trip-server';
import { tripStorage } from '@/storage/trip';
import { colors } from '@/styles/colors';
import { DatesSelected, calendarUtils } from '@/utils/calendarUtils';
import { validateInput } from '@/utils/validateInput';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import {
	ArrowRight,
	AtSign,
	Calendar as CalendarIcon,
	MapPin,
	Settings2,
	UserRoundPlus,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, Keyboard, Text, View } from 'react-native';
import { DateData } from 'react-native-calendars';

enum StepForm {
	TRIP_DETAILS = 1,
	ADD_EMAIL = 2,
}

enum MODAL {
	NONE = 0,
	CALENDAR = 1,
	GUESTS = 2,
}

export default function Index() {
	const [isCreatingTrip, setIsCreatingTrip] = useState(false);

	const [selectedDates, setSelectedDates] = useState<DatesSelected>();
	const [stepForm, setStepForm] = useState<StepForm>(StepForm.TRIP_DETAILS);
	const [showModal, setShowModal] = useState<MODAL>(MODAL.NONE);
	const [destination, setDestination] = useState('');
	const [guestEmail, setGuestEmail] = useState<string>('');
	const [emailsToInvite, setEmailsToInvite] = useState<string[]>([]);

	function handleNextStepForm() {
		switch (stepForm) {
			case StepForm.TRIP_DETAILS:
				if (
					!destination ||
					!selectedDates?.startsAt ||
					!selectedDates?.endsAt
				) {
					return Alert.alert(
						'Detalhes da viagem',
						'Por favor, preencha todos os dados da viagem.'
					);
				}

				if (destination.length < 4) {
					return Alert.alert(
						'Detalhes da viagem',
						'O destino da sua viagem deve ter pelo menos 4 letras.'
					);
				}

				setStepForm(StepForm.ADD_EMAIL);
				break;
			case StepForm.ADD_EMAIL:
				Alert.alert('Nova viagem', 'Confirmar viagem?', [
					{
						text: 'Não',
						style: 'cancel',
					},
					{
						text: 'Sim',
						onPress: createTrip,
					},
				]);
				break;
		}
	}

	function handleSelectedDate(selectedDay: DateData) {
		const dates = calendarUtils.orderStartsAtAndEndsAt({
			startsAt: selectedDates?.startsAt,
			endsAt: selectedDates?.endsAt,
			selectedDay,
		});

		setSelectedDates(dates);
	}

	function handleRemoveEmail(email: string) {
		setEmailsToInvite((prevState) => prevState.filter((e) => e !== email));
	}

	function handleAddEmail() {
		if (!validateInput.email(guestEmail)) {
			return Alert.alert('Convidado', 'Por favor, informe um e-mail válido.');
		}

		if (emailsToInvite.includes(guestEmail)) {
			return Alert.alert('Convidado', 'Este convidado ja foi adicionado.');
		}

		setEmailsToInvite((prevState) => [...prevState, guestEmail]);
		setGuestEmail('');
	}

	async function saveTrip(tripId: string) {
		try {
			await tripStorage.save(tripId);
			router.navigate(`/trip/${tripId}`);
		} catch (error) {
			Alert.alert('Erro ao salvar viagem', 'Por favor, tente novamente.');
		}
	}

	async function createTrip() {
		try {
			setIsCreatingTrip(true);
			const newTrip = await tripServer.create({
				destination,
				starts_at: dayjs(selectedDates?.startsAt?.dateString).toString(),
				ends_at: dayjs(selectedDates?.endsAt?.dateString).toString(),
				emails_to_invite: emailsToInvite,
			});

			Alert.alert('Sucesso', 'Viagem criada com sucesso!', [
				{ text: 'Ok, Continuar.', onPress: () => saveTrip(newTrip.tripId) },
			]);
		} catch (error) {
			Alert.alert('Erro ao criar viagem', 'Por favor, tente novamente.');
		} finally {
			setIsCreatingTrip(false);
		}
	}

	return (
		<View className='flex-1 items-center justify-center gap-3 px-5'>
			<Image
				source={require('@/assets/logo.png')}
				className='h-8'
				resizeMode='contain'
			/>

			<Image
				source={require('@/assets/bg.png')}
				className='absolute'
			/>

			<Text className='text-zinc-400 font-regular text-center text-lg'>
				Convide seus amigos e planeje sua{'\n'}
				próxima viagem!
			</Text>

			<View className='w-full bg-zinc-900 p-4 my-8 rounded-lg border border-zinc-800'>
				<Input>
					<MapPin
						color={colors.zinc[400]}
						size={20}
					/>
					<Input.Field
						placeholder='Para onde?'
						editable={stepForm === StepForm.TRIP_DETAILS}
						value={destination}
						onChangeText={setDestination}
					/>
				</Input>

				<Input>
					<CalendarIcon
						color={colors.zinc[400]}
						size={20}
					/>
					<Input.Field
						placeholder='Quando?'
						editable={stepForm === StepForm.TRIP_DETAILS}
						onFocus={() => Keyboard.dismiss()}
						showSoftInputOnFocus={false}
						onPressIn={() =>
							stepForm === StepForm.TRIP_DETAILS && setShowModal(MODAL.CALENDAR)
						}
						value={selectedDates?.formatDatesInText}
					/>
				</Input>

				{stepForm === StepForm.ADD_EMAIL && (
					<>
						<View className='border-b border-zinc-800 py-3'>
							<Button
								variant='secondary'
								onPress={() => setStepForm(StepForm.TRIP_DETAILS)}
							>
								<Button.Title>Alterar local/data</Button.Title>
								<Settings2
									color={colors.zinc[200]}
									size={20}
								/>
							</Button>
						</View>

						<Input>
							<UserRoundPlus
								color={colors.zinc[400]}
								size={20}
							/>
							<Input.Field
								placeholder='Quem estará na viagem?'
								autoCorrect={false}
								value={
									emailsToInvite.length > 0
										? `${emailsToInvite.length} pessoa(s) convidada(s)`
										: ''
								}
								onPress={() => {
									Keyboard.dismiss();
									setShowModal(MODAL.GUESTS);
								}}
								showSoftInputOnFocus={false}
							/>
						</Input>
					</>
				)}
				<Button
					onPress={handleNextStepForm}
					isLoading={isCreatingTrip}
				>
					<Button.Title>
						{stepForm === StepForm.TRIP_DETAILS
							? 'Continuar'
							: 'Confirmar Viagem'}
					</Button.Title>
					<ArrowRight
						color={colors.lime[950]}
						size={20}
					/>
				</Button>
			</View>

			<Text className='text-zinc-500 font-regular text-center text-base'>
				Ao planejar sua viagem pela plann.er, você automaticamente concorda com
				nossos <Text className='text-zinc-300 underline'>Termos de Uso</Text> e{' '}
				<Text className='text-zinc-300 underline'>
					Políticas de Privacidade
				</Text>
				.
			</Text>

			<Modal
				title='Selecionar datas'
				subtitle='Selecione as datas de início e fim da sua viagem'
				visible={showModal === MODAL.CALENDAR}
				onClose={() => setShowModal(MODAL.NONE)}
			>
				<View className='gap-4 mt-4'>
					<Calendar
						onDayPress={handleSelectedDate}
						markedDates={selectedDates?.dates}
						minDate={dayjs().toISOString()}
					/>
					<Button onPress={() => setShowModal(MODAL.NONE)}>
						<Button.Title>Confirmar</Button.Title>
					</Button>
				</View>
			</Modal>

			<Modal
				title='Selecionar convidados'
				subtitle='Os convidados irão receber e-mails para confirmar a participação na viagem.'
				visible={showModal === MODAL.GUESTS}
				onClose={() => setShowModal(MODAL.NONE)}
			>
				<View className='my-2 flex-wrap gap-2 border-b border-zinc-800 py-5 items-start'>
					{emailsToInvite.length > 0 ? (
						emailsToInvite.map((email) => (
							<GuestEmail
								key={email}
								email={email}
								onRemove={() => handleRemoveEmail(email)}
							/>
						))
					) : (
						<Text className='text-zinc-600 text-base font-regular'>
							Nenhum e-mail convidado
						</Text>
					)}
				</View>

				<View className='gap-4 mt-4'>
					<Input variant='secondary'>
						<AtSign
							color={colors.zinc[400]}
							size={20}
						/>
						<Input.Field
							placeholder='Digite o e-mail do convidado'
							keyboardType='email-address'
							value={guestEmail}
							onChangeText={(text) => setGuestEmail(text.toLowerCase())}
							returnKeyType='send'
							onSubmitEditing={handleAddEmail}
						/>
					</Input>
					<Button onPress={handleAddEmail}>
						<Button.Title>Convidar</Button.Title>
					</Button>
				</View>
			</Modal>
		</View>
	);
}
