import { View, Text, Keyboard, Alert, SectionList } from 'react-native';
import { TripData } from './[id]';
import { Button } from '@/components/button';
import {
	Plus,
	Tag,
	Calendar as IconCalendar,
	Clock,
} from 'lucide-react-native';
import { colors } from '@/styles/colors';
import { Modal } from '@/components/modal';
import { useEffect, useState } from 'react';
import { Input } from '@/components/input';
import { DatesSelected, calendarUtils } from '@/utils/calendarUtils';
import { Calendar } from '@/components/calendar';
import dayjs from 'dayjs';
import { DateData } from 'react-native-calendars';
import { activitiesServer } from '@/server/activities-server';
import { Loading } from '@/components/loading';
import { Activity, ActivityProps } from '@/components/activity';

type Props = {
	tripDetails: TripData;
};

type TripActivities = {
	title: {
		dayNumber: number;
		dayName: string;
	};
	data: ActivityProps[];
};

enum MODAL {
	NONE = 0,
	CALENDAR = 1,
	NEW_ACTIVITY = 2,
}

export function Activities({ tripDetails }: Props) {
	const [showModal, setShowModal] = useState(MODAL.NONE);

	const [isLoadingActivities, setIsLoadingActivities] = useState(true);
	const [isCreatingActivity, setIsCreatingActivity] = useState(false);

	const [tripActivities, setTripActivities] = useState<TripActivities[]>([]);

	const [activityTitle, setActivityTitle] = useState('');
	const [activityDate, setActivityDate] = useState('');
	const [activityHour, setActivityHour] = useState('');

	function resetNewActivityFields() {
		setActivityTitle('');
		setActivityDate('');
		setActivityHour('');
		setShowModal(MODAL.NONE);
	}

	async function handleCreateActivity() {
		try {
			if (!activityTitle || !activityDate || !activityHour) {
				return Alert.alert(
					'Cadastrar atividade',
					'Por favor, preencha todos os dados da atividade.'
				);
			}
			setIsCreatingActivity(true);

			const data = await activitiesServer.create({
				tripId: tripDetails.id,
				title: activityTitle,
				occurs_at: dayjs(activityDate)
					.add(Number(activityHour), 'h')
					.toString(),
			});

			const newActivity = data.activity;

			setTripActivities((prevState) =>
				prevState.map((trip) => {
					if (trip.title.dayNumber === dayjs(newActivity.occurs_at).date()) {
						return {
							...trip,
							data: [
								...trip.data,
								{
									id: newActivity.id,
									title: newActivity.title,
									hour: dayjs(newActivity.occurs_at).format('HH[:]mm[h]'),
									isBefore: dayjs(newActivity.occurs_at).isBefore(dayjs()),
								},
							],
						};
					}
					return trip;
				})
			);

			Alert.alert('Sucesso', 'Atividade criada com sucesso!');
			resetNewActivityFields();
		} catch (error) {
			Alert.alert('Erro ao criar atividade', 'Por favor, tente novamente.');
		} finally {
			setIsCreatingActivity(false);
		}
	}

	async function getTripActivities() {
		try {
			const activities = await activitiesServer.getActivitiesByTripId(
				tripDetails.id
			);
			const activitiesToSectionList = activities.map((dayActivity) => ({
				title: {
					dayNumber: dayjs(dayActivity.date).date(),
					dayName: dayjs(dayActivity.date).format('dddd').replace(/-/g, ' '),
				},
				data: dayActivity.activities.map((activity) => ({
					id: activity.id,
					title: activity.title,
					hour: dayjs(activity.occurs_at).format('HH[:]mm[h]'),
					isBefore: dayjs(activity.occurs_at).isBefore(dayjs()),
				})),
			}));
			setTripActivities(activitiesToSectionList);
		} catch (error) {
			console.error(error);
		} finally {
			setIsLoadingActivities(false);
		}
	}

	useEffect(() => {
		async function fetchData() {
			await getTripActivities();
		}
		fetchData();
	}, []);

	return (
		<View className='flex-1'>
			<View className='w-full flex-row mt-5 mb-6 items-center'>
				<Text className='text-zinc-50 text-2xl font-semibold flex-1'>
					Atividades
				</Text>

				<Button onPress={() => setShowModal(MODAL.NEW_ACTIVITY)}>
					<Plus color={colors.lime[950]} />
					<Button.Title>Nova atividade</Button.Title>
				</Button>
			</View>

			{isLoadingActivities ? (
				<Loading />
			) : (
				<SectionList
					sections={tripActivities}
					keyExtractor={(item) => item.id}
					renderItem={({ item }) => <Activity data={item} />}
					renderSectionHeader={({ section }) => (
						<View className='w-full'>
							<Text className='text-zinc-50 text-2xl font-semibold py-2'>
								Dia {section.title.dayNumber + ' '}
								<Text className='text-zinc-500 text-base font-regular capitalize'>
									{section.title.dayName}
								</Text>
							</Text>

							{section.data.length === 0 && (
								<Text className='text-zinc-500 font-regular text-sm mb-2'>
									Nenhuma atividade cadastrada nessa data.
								</Text>
							)}
						</View>
					)}
					contentContainerClassName='gap-2 pb-48'
					showsVerticalScrollIndicator={false}
				/>
			)}

			<Modal
				title='Cadastrar atividade'
				subtitle='Todos os convidados podem visualizar as atividades'
				visible={showModal === MODAL.NEW_ACTIVITY}
				onClose={() => setShowModal(MODAL.NONE)}
			>
				<View className='mt-4 mb-3'>
					<Input variant='secondary'>
						<Tag
							color={colors.zinc[400]}
							size={20}
						/>
						<Input.Field
							placeholder='Qual atividade?'
							onChangeText={setActivityTitle}
							value={activityTitle}
						/>
					</Input>

					<View className='w-full mt-2 flex-row gap-2'>
						<Input
							variant='secondary'
							className='flex-1'
						>
							<IconCalendar
								color={colors.zinc[400]}
								size={20}
							/>
							<Input.Field
								placeholder='Data'
								onChangeText={setActivityTitle}
								value={
									activityDate ? dayjs(activityDate).format('DD [de] MMMM') : ''
								}
								onFocus={() => Keyboard.dismiss()}
								showSoftInputOnFocus={false}
								onPressIn={() => setShowModal(MODAL.CALENDAR)}
							/>
						</Input>

						<Input
							variant='secondary'
							className='flex-1'
						>
							<Clock
								color={colors.zinc[400]}
								size={20}
							/>
							<Input.Field
								placeholder='Horário'
								onChangeText={(text) =>
									setActivityHour(text.replace(/[^0-9]/g, ''))
								}
								value={activityHour}
								keyboardType='numeric'
								maxLength={2}
							/>
						</Input>
					</View>
				</View>
				<Button
					onPress={handleCreateActivity}
					isLoading={isCreatingActivity}
				>
					<Button.Title>Salvar atividade</Button.Title>
				</Button>
			</Modal>

			<Modal
				title='Selecionar data'
				subtitle='Selecione a data da atividade'
				visible={showModal === MODAL.CALENDAR}
				onClose={() => setShowModal(MODAL.NONE)}
			>
				<View className='gap-4 mt-4'>
					<Calendar
						onDayPress={(day) => setActivityDate(day.dateString)}
						markedDates={{ [activityDate]: { selected: true } }}
						initialDate={tripDetails.starts_at.toString()}
						minDate={tripDetails.starts_at.toString()}
						maxDate={tripDetails.ends_at.toString()}
					/>

					<Button onPress={() => setShowModal(MODAL.NEW_ACTIVITY)}>
						<Button.Title>Confirmar</Button.Title>
					</Button>
				</View>
			</Modal>
		</View>
	);
}
