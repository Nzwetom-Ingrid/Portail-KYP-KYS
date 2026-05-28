import { makeStyles, Badge } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    maxWidth: '720px',
    margin: '40px auto',
    textAlign: 'center',
    padding: '48px 32px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #F4F4F4',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.04)',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1A1A1A',
    marginBottom: '8px',
  },
  description: {
    fontSize: '14px',
    color: '#767676',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  sprintBadge: {
    display: 'inline-block',
    marginTop: '16px',
  },
});

interface PageStubProps {
  title: string;
  description: string;
  sprint: string;
  dependencies?: string;
}

export function PageStub({ title, description, sprint, dependencies }: PageStubProps) {
  const styles = useStyles();
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      {dependencies && (
        <p className={styles.description} style={{ fontSize: '12px', fontStyle: 'italic' }}>
          Dépend de : {dependencies}
        </p>
      )}
      <div className={styles.sprintBadge}>
        <Badge appearance="tint" color="brand" size="medium">{sprint}</Badge>
      </div>
    </div>
  );
}