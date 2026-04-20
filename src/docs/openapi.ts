import swaggerJSDoc from 'swagger-jsdoc';

const authResponse = {
  type: 'object',
  properties: {
    token: { type: 'string' },
    user: { $ref: '#/components/schemas/User' },
  },
};

export const openApiSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'DoLearn Backend API',
      version: '0.1.0',
      description:
        'API documentation for the DoLearn tutoring platform backend.',
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Local development',
      },
    ],
    tags: [
      { name: 'Health' },
      { name: 'Auth' },
      { name: 'Admin Teachers' },
      { name: 'Admin Students' },
      { name: 'Admin Sessions' },
      { name: 'Admin Payments' },
      { name: 'Family' },
      { name: 'Teacher' },
      { name: 'Notifications' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: {
              type: 'string',
              enum: ['PARENT', 'STUDENT', 'TEACHER', 'ADMIN'],
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE', 'TERMINATED'],
            },
          },
        },
        RegisterInput: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Amara Okafor' },
            email: { type: 'string', example: 'amara@example.com' },
            password: { type: 'string', example: 'Password123' },
            whatsapp: { type: 'string', example: '+447700900123' },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'amara@example.com' },
            password: { type: 'string', example: 'Password123' },
          },
        },
        GoogleAuthInput: {
          type: 'object',
          required: ['idToken'],
          properties: {
            idToken: { type: 'string' },
          },
        },
        CreateTeacherInput: {
          type: 'object',
          required: [
            'firstName',
            'lastName',
            'email',
            'subjects',
            'hourlyRate',
            'defaultPassword',
          ],
          properties: {
            firstName: { type: 'string', example: 'Daniel' },
            lastName: { type: 'string', example: 'Adeyemi' },
            email: { type: 'string', example: 'daniel@example.com' },
            phoneCountry: { type: 'string', example: '+234' },
            phoneNumber: { type: 'string', example: '8012345678' },
            bio: { type: 'string' },
            subjects: {
              type: 'array',
              items: { type: 'string' },
              example: ['Maths', 'Further Maths'],
            },
            qualifications: {
              type: 'array',
              items: { type: 'string' },
              example: ['BSc Mathematics', 'PGCE'],
            },
            hourlyRate: { type: 'number', example: 20 },
            defaultPassword: { type: 'string', example: 'Teacher123' },
          },
        },
        CreateStudentInput: {
          type: 'object',
          required: ['fullName', 'age', 'grade'],
          properties: {
            fullName: { type: 'string', example: 'Zara Okafor' },
            age: { type: 'number', example: 14 },
            grade: {
              type: 'string',
              example: 'JSS',
            },
            gradeOther: { type: 'string' },
            school: { type: 'string', example: 'Bright Future Academy' },
          },
        },
        SaveIntakeInput: {
          type: 'object',
          required: [
            'subject',
            'subjects',
            'learningGoal',
            'currentLevel',
            'teacherGenderPref',
            'sessionsPerWeek',
            'budget',
            'schedule',
          ],
          properties: {
            subject: { type: 'string', example: 'Maths' },
            subjects: {
              type: 'array',
              items: { type: 'string' },
              example: ['Maths', 'Coding'],
            },
            subjectOther: { type: 'string' },
            learningGoal: { type: 'string', example: 'EXAM_PREP' },
            currentLevel: { type: 'string', example: 'AVERAGE' },
            specificTopics: { type: 'string', example: 'Algebra' },
            teacherGenderPref: { type: 'string', example: 'NO_PREFERENCE' },
            specialNotes: { type: 'string' },
            timezone: { type: 'string', example: 'Africa/Lagos' },
            sessionsPerWeek: { type: 'string', example: '3' },
            budget: { type: 'string', example: '$20-$35' },
            schedule: {
              type: 'array',
              items: {
                type: 'object',
                required: ['day', 'time'],
                properties: {
                  day: { type: 'string', example: 'MON' },
                  time: { type: 'string', example: 'EVENING' },
                },
              },
            },
          },
        },
        CreateSessionProposalInput: {
          type: 'object',
          required: [
            'studentId',
            'subject',
            'startsAt',
            'durationMins',
            'timeBlock',
          ],
          properties: {
            studentId: { type: 'string' },
            subject: { type: 'string', example: 'Maths' },
            startsAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-22T18:00:00.000Z',
            },
            durationMins: { type: 'number', example: 60 },
            timeBlock: { type: 'string', example: 'EVENING' },
            note: { type: 'string' },
          },
        },
        SessionNoteInput: {
          type: 'object',
          required: ['covered', 'performance', 'rating', 'focusNext'],
          properties: {
            covered: { type: 'string', example: 'Linear equations' },
            performance: {
              type: 'string',
              enum: ['EXCELLENT', 'GOOD', 'NEEDS_WORK'],
            },
            rating: { type: 'number', example: 4 },
            focusNext: { type: 'string', example: 'Quadratic equations' },
            concerns: { type: 'string' },
          },
        },
        CancellationInput: {
          type: 'object',
          required: ['reason'],
          properties: {
            reason: { type: 'string', example: 'Student is unavailable' },
          },
        },
        MeetingLinkInput: {
          type: 'object',
          required: ['meetLink'],
          properties: {
            meetLink: {
              type: 'string',
              example: 'https://meet.google.com/demo-class-link',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
        ChangePasswordInput: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', example: 'OldPassword123' },
            newPassword: { type: 'string', example: 'NewPassword456' },
          },
        },
        CreatePaymentInput: {
          type: 'object',
          required: ['parentId', 'plan', 'amount', 'gateway', 'sessionsIncluded'],
          properties: {
            parentId: { type: 'string' },
            plan: {
              type: 'string',
              enum: ['STARTER_5', 'GROWTH_10', 'FAMILY_20'],
              example: 'GROWTH_10',
            },
            amount: { type: 'number', example: 150 },
            gateway: {
              type: 'string',
              enum: ['PAYSTACK', 'STRIPE', 'MANUAL'],
              example: 'PAYSTACK',
            },
            sessionsIncluded: { type: 'integer', example: 10 },
          },
        },
        MarkPayoutPaidInput: {
          type: 'object',
          required: ['teacherId', 'month'],
          properties: {
            teacherId: { type: 'string' },
            month: {
              type: 'string',
              example: '2026-04',
              description: 'Year-month in YYYY-MM format',
            },
          },
        },
        UpdateNotificationReadInput: {
          type: 'object',
          required: ['read'],
          properties: {
            read: { type: 'boolean', example: true },
          },
        },
      },
    },
    paths: {
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Check API health',
          responses: {
            200: { description: 'API is running' },
          },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a family account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterInput' },
              },
            },
          },
          responses: {
            201: {
              description: 'Registered',
              content: { 'application/json': { schema: authResponse } },
            },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login with email and password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginInput' },
              },
            },
          },
          responses: {
            200: {
              description: 'Logged in',
              content: { 'application/json': { schema: authResponse } },
            },
          },
        },
      },
      '/api/auth/google': {
        post: {
          tags: ['Auth'],
          summary: 'Login or signup with Google',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GoogleAuthInput' },
              },
            },
          },
          responses: {
            200: {
              description: 'Authenticated with Google',
              content: { 'application/json': { schema: authResponse } },
            },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Current user' },
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout placeholder for clients',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Logged out' },
          },
        },
      },
      '/api/auth/change-password': {
        post: {
          tags: ['Auth'],
          summary: 'Change password for the current user',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ChangePasswordInput' },
              },
            },
          },
          responses: {
            200: { description: 'Password changed' },
            400: {
              description: 'Current password invalid or new password too weak',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/admin/teachers': {
        get: {
          tags: ['Admin Teachers'],
          summary: 'List teachers',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Teachers' } },
        },
        post: {
          tags: ['Admin Teachers'],
          summary: 'Create teacher account',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateTeacherInput' },
              },
            },
          },
          responses: { 201: { description: 'Teacher created' } },
        },
      },
      '/api/admin/teachers/{teacherId}/rate': {
        patch: {
          tags: ['Admin Teachers'],
          summary: 'Update teacher hourly rate',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'teacherId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['hourlyRate'],
                  properties: { hourlyRate: { type: 'number', example: 25 } },
                },
              },
            },
          },
          responses: { 200: { description: 'Rate updated' } },
        },
      },
      '/api/admin/teachers/{teacherId}/terminate': {
        post: {
          tags: ['Admin Teachers'],
          summary: 'Terminate teacher and unassign students',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'teacherId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['reason'],
                  properties: { reason: { type: 'string', example: 'Misconduct case' } },
                },
              },
            },
          },
          responses: { 200: { description: 'Teacher terminated' } },
        },
      },
      '/api/admin/students': {
        get: {
          tags: ['Admin Students'],
          summary: 'List students',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Students' } },
        },
      },
      '/api/admin/students/pending-intakes': {
        get: {
          tags: ['Admin Students'],
          summary: 'List students with intake but no teacher',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Pending intakes' } },
        },
      },
      '/api/admin/students/{studentId}/assign-teacher': {
        post: {
          tags: ['Admin Students'],
          summary: 'Assign teacher to student',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'studentId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['teacherId'],
                  properties: { teacherId: { type: 'string' } },
                },
              },
            },
          },
          responses: { 200: { description: 'Teacher assigned' } },
        },
      },
      '/api/admin/students/{studentId}/unassign-teacher': {
        post: {
          tags: ['Admin Students'],
          summary: 'Remove assigned teacher from student',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'studentId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Teacher unassigned' } },
        },
      },
      '/api/admin/sessions': {
        get: {
          tags: ['Admin Sessions'],
          summary: 'List all sessions',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Sessions' } },
        },
      },
      '/api/admin/sessions/{sessionId}/meeting-link': {
        patch: {
          tags: ['Admin Sessions'],
          summary: 'Assign or update meeting link for a session',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MeetingLinkInput' },
              },
            },
          },
          responses: { 200: { description: 'Meeting link updated' } },
        },
      },
      '/api/admin/sessions/cancellations': {
        get: {
          tags: ['Admin Sessions'],
          summary: 'List cancellation requests',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Cancellation requests' } },
        },
      },
      '/api/admin/sessions/cancellations/{requestId}/approve': {
        post: {
          tags: ['Admin Sessions'],
          summary: 'Approve cancellation request and cancel session',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'requestId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Cancellation approved' } },
        },
      },
      '/api/admin/sessions/cancellations/{requestId}/reject': {
        post: {
          tags: ['Admin Sessions'],
          summary: 'Reject cancellation request',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'requestId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Cancellation rejected' } },
        },
      },
      '/api/admin/payments': {
        get: {
          tags: ['Admin Payments'],
          summary: 'List all payments',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Payments' } },
        },
        post: {
          tags: ['Admin Payments'],
          summary: 'Record a payment against a family plan',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreatePaymentInput' },
              },
            },
          },
          responses: { 201: { description: 'Payment recorded' } },
        },
      },
      '/api/admin/payments/parents': {
        get: {
          tags: ['Admin Payments'],
          summary: 'List parent accounts available for payment recording',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Parents' } },
        },
      },
      '/api/admin/payments/payouts': {
        get: {
          tags: ['Admin Payments'],
          summary: 'List teacher payout summaries for a month',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'month',
              in: 'query',
              required: false,
              description: 'Month to summarise in YYYY-MM format (defaults to current month)',
              schema: { type: 'string', example: '2026-04' },
            },
          ],
          responses: { 200: { description: 'Payout summaries' } },
        },
      },
      '/api/admin/payments/payouts/mark-paid': {
        post: {
          tags: ['Admin Payments'],
          summary: 'Mark a teacher payout as paid for a given month',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MarkPayoutPaidInput' },
              },
            },
          },
          responses: { 200: { description: 'Payout marked as paid' } },
        },
      },
      '/api/family/me': {
        get: {
          tags: ['Family'],
          summary: 'Get family profile',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Family profile' } },
        },
      },
      '/api/family/payments': {
        get: {
          tags: ['Family'],
          summary: 'List payments recorded for this family',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Payments' } },
        },
      },
      '/api/family/students': {
        get: {
          tags: ['Family'],
          summary: 'List family students',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Students' } },
        },
        post: {
          tags: ['Family'],
          summary: 'Create a student',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateStudentInput' },
              },
            },
          },
          responses: { 201: { description: 'Student created' } },
        },
      },
      '/api/family/students/{studentId}/intake': {
        put: {
          tags: ['Family'],
          summary: 'Save student intake and availability',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'studentId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SaveIntakeInput' },
              },
            },
          },
          responses: { 200: { description: 'Intake saved' } },
        },
      },
      '/api/family/students/{studentId}/deactivate': {
        post: {
          tags: ['Family'],
          summary: 'Deactivate a student with reason',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'studentId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['reason'],
                  properties: { reason: { type: 'string', example: 'Taking a break for exams' } },
                },
              },
            },
          },
          responses: { 200: { description: 'Student deactivated' } },
        },
      },
      '/api/family/students/{studentId}/reactivate': {
        post: {
          tags: ['Family'],
          summary: 'Reactivate a student',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'studentId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Student reactivated' } },
        },
      },
      '/api/family/sessions': {
        get: {
          tags: ['Family'],
          summary: 'List family sessions',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Sessions' } },
        },
      },
      '/api/family/sessions/{sessionId}/attendance/confirm': {
        post: {
          tags: ['Family'],
          summary: 'Family confirms that a class held',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Attendance confirmed' } },
        },
      },
      '/api/family/sessions/{sessionId}/cancellations': {
        post: {
          tags: ['Family'],
          summary: 'Family requests session cancellation',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CancellationInput' },
              },
            },
          },
          responses: { 201: { description: 'Cancellation requested' } },
        },
      },
      '/api/family/session-proposals': {
        get: {
          tags: ['Family'],
          summary: 'List proposed sessions for family review',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Session proposals' } },
        },
      },
      '/api/family/session-proposals/{proposalId}/accept': {
        post: {
          tags: ['Family'],
          summary: 'Accept proposed session',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'proposalId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Proposal accepted and session created' } },
        },
      },
      '/api/family/session-proposals/{proposalId}/decline': {
        post: {
          tags: ['Family'],
          summary: 'Decline proposed session',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'proposalId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Proposal declined' } },
        },
      },
      '/api/teacher/me': {
        get: {
          tags: ['Teacher'],
          summary: 'Get teacher profile',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Teacher profile' } },
        },
      },
      '/api/teacher/students': {
        get: {
          tags: ['Teacher'],
          summary: 'List assigned students',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Assigned students' } },
        },
      },
      '/api/teacher/sessions': {
        get: {
          tags: ['Teacher'],
          summary: 'List teacher sessions',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Sessions' } },
        },
      },
      '/api/teacher/payouts': {
        get: {
          tags: ['Teacher'],
          summary: 'List monthly payout summaries for the current teacher',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Payouts' } },
        },
      },
      '/api/teacher/sessions/{sessionId}/attendance/confirm': {
        post: {
          tags: ['Teacher'],
          summary: 'Teacher confirms that a class held',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Attendance confirmed' } },
        },
      },
      '/api/teacher/sessions/{sessionId}/notes': {
        post: {
          tags: ['Teacher'],
          summary: 'Create or update a session note',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SessionNoteInput' },
              },
            },
          },
          responses: { 201: { description: 'Session note saved' } },
        },
      },
      '/api/teacher/sessions/{sessionId}/cancellations': {
        post: {
          tags: ['Teacher'],
          summary: 'Teacher requests session cancellation',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CancellationInput' },
              },
            },
          },
          responses: { 201: { description: 'Cancellation requested' } },
        },
      },
      '/api/teacher/session-proposals': {
        post: {
          tags: ['Teacher'],
          summary: 'Propose a class time to the family',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateSessionProposalInput',
                },
              },
            },
          },
          responses: { 201: { description: 'Proposal created' } },
        },
      },
      '/api/notifications': {
        get: {
          tags: ['Notifications'],
          summary: 'List notifications for the current user',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Notifications' } },
        },
      },
      '/api/notifications/{notificationId}/read': {
        patch: {
          tags: ['Notifications'],
          summary: 'Mark a single notification as read or unread',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'notificationId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpdateNotificationReadInput',
                },
              },
            },
          },
          responses: { 200: { description: 'Notification updated' } },
        },
      },
      '/api/notifications/read-all': {
        post: {
          tags: ['Notifications'],
          summary: 'Mark all notifications as read for the current user',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'All notifications marked as read' } },
        },
      },
    },
  },
  apis: [],
});
