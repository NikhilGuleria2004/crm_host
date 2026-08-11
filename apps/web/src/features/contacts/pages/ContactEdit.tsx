import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@crm/ui';
import { ContactForm } from '../components/ContactForm';
import { useContact, useUpdateContact } from '../hooks/useContacts';
import type { ContactFormData } from '../components/ContactForm';
import { Toast } from '@crm/ui';
import { useState } from 'react';

export function ContactEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useContact(id || '');
  const updateMutation = useUpdateContact();
  const [serverError, setServerError] = useState<string | null>(error ? 'Failed to load contact' : null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  if (!id) {
    return <div className="text-danger">Contact ID is required</div>;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-muted/50 rounded animate-pulse mt-6" />
      </div>
    );
  }

  const contact = data?.data;

  const handleSubmit = async (formData: ContactFormData) => {
    try {
      setServerError(null);
      await updateMutation.mutateAsync({ id, data: formData });
      setToast({ message: 'Contact updated successfully', type: 'success' });
      setTimeout(() => {
        navigate(`/app/contacts/${id}`);
      }, 500);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to update contact');
      setToast({ message: 'Failed to update contact', type: 'error' });
    }
  };

  if (!contact && !isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-danger">Contact not found or you don't have permission to view it.</div>
        <div>
          <Link to="/app/contacts">
            <Button variant="secondary">Back to Contacts</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex items-center gap-4">
        <div>
          <Link to={`/app/contacts/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Edit Contact</h1>
          <p className="text-muted-foreground mt-1">
            Editing {contact?.firstName} {contact?.lastName}
          </p>
        </div>
      </div>

      {serverError && (
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          {serverError}
        </div>
      )}

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          {contact && (
            <ContactForm
              onSubmit={handleSubmit}
              initialData={{
                firstName: contact.firstName,
                lastName: contact.lastName,
                email: contact.email,
                phone: contact.phone,
                jobTitle: contact.jobTitle,
                companyId: contact.company?.id,
                ownerId: contact.owner?.id,
                status: contact.status,
                source: contact.source,
                address: contact.address,
              }}
              submitLabel="Save Changes"
              isLoading={updateMutation.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}
