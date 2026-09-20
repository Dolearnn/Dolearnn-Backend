import { Router } from 'express';
import { AppError, asyncHandler } from '../../../lib/http';
import {
  createExamSchema,
  createSubjectSchema,
  createTopicSchema,
  importQuestionsSchema,
  listQuestionsQuerySchema,
  setQuestionStatusSchema,
  updateExamSchema,
  updateQuestionSchema,
  updateSubjectSchema,
} from './quiz-admin.schemas';
import {
  createExam,
  createSubject,
  createTopic,
  getQuizOverview,
  importQuestions,
  listQuestions,
  setQuestionStatus,
  updateExam,
  updateQuestion,
  updateSubject,
} from './quiz-admin.service';

export const quizAdminRoutes = Router();

function getRouteParam(value: string | string[], name: string) {
  if (Array.isArray(value)) {
    throw new AppError(400, `Invalid ${name}`);
  }
  return value;
}

quizAdminRoutes.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    res.json(await getQuizOverview());
  }),
);

quizAdminRoutes.post(
  '/exams',
  asyncHandler(async (req, res) => {
    const exam = await createExam(createExamSchema.parse(req.body));
    res.status(201).json({ exam });
  }),
);

quizAdminRoutes.patch(
  '/exams/:examId',
  asyncHandler(async (req, res) => {
    const examId = getRouteParam(req.params.examId, 'exam id');
    const exam = await updateExam(examId, updateExamSchema.parse(req.body));
    res.json({ exam });
  }),
);

quizAdminRoutes.post(
  '/subjects',
  asyncHandler(async (req, res) => {
    const subject = await createSubject(createSubjectSchema.parse(req.body));
    res.status(201).json({ subject });
  }),
);

quizAdminRoutes.patch(
  '/subjects/:subjectId',
  asyncHandler(async (req, res) => {
    const subjectId = getRouteParam(req.params.subjectId, 'subject id');
    const subject = await updateSubject(subjectId, updateSubjectSchema.parse(req.body));
    res.json({ subject });
  }),
);

quizAdminRoutes.post(
  '/topics',
  asyncHandler(async (req, res) => {
    const topic = await createTopic(createTopicSchema.parse(req.body));
    res.status(201).json({ topic });
  }),
);

quizAdminRoutes.get(
  '/questions',
  asyncHandler(async (req, res) => {
    const query = listQuestionsQuerySchema.parse(req.query);
    res.json(await listQuestions(query));
  }),
);

quizAdminRoutes.post(
  '/questions/import',
  asyncHandler(async (req, res) => {
    const input = importQuestionsSchema.parse(req.body);
    res.status(201).json(await importQuestions(input.questions));
  }),
);

quizAdminRoutes.post(
  '/questions/status',
  asyncHandler(async (req, res) => {
    const input = setQuestionStatusSchema.parse(req.body);
    res.json(await setQuestionStatus(input));
  }),
);

quizAdminRoutes.patch(
  '/questions/:questionId',
  asyncHandler(async (req, res) => {
    const questionId = getRouteParam(req.params.questionId, 'question id');
    const question = await updateQuestion(
      questionId,
      updateQuestionSchema.parse(req.body),
    );
    res.json({ question });
  }),
);
