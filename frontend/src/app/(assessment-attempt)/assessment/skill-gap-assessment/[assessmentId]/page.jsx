import AssessmentInstructions from '@/components/assessment-attempt/AssessmentInstructions';
import { QuestionProvider } from '@/context/QuestionContext';

const Page = async ({ params }) => {
  const { assessmentId } = await params;
  return (
    <QuestionProvider>
      <AssessmentInstructions assessmentId={assessmentId} />;
    </QuestionProvider>
  );
};

export default Page;
