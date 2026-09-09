import { ConditionalBlockBackNavigation } from '@/components/assessment-attempt/BlockBackNavigation';
import Questions from '@/components/assessment-attempt/Questions';
import Security from '@/components/assessment-attempt/Security';
import { ExamProvider } from '@/context/ExamContext';
import { QuestionProvider } from '@/context/QuestionContext';
import { UserActivityProvider } from '@/context/UserActivityContext';

const Page = () => {
  return (
    <UserActivityProvider>
      <QuestionProvider>
        <ExamProvider>
          <ConditionalBlockBackNavigation>
            <Security>
              <Questions />
            </Security>
          </ConditionalBlockBackNavigation>
        </ExamProvider>
      </QuestionProvider>
    </UserActivityProvider>
  );
};

export default Page;
